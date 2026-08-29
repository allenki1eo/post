import { editDraftPayload, validateApprovalForExecution } from '../src/agents/approvalStore';
import { DemoAgentRuntime, replayFixture } from '../src/agents/DemoAgentRuntime';
import { checkToolPermission } from '../src/agents/permissions';
import { getToolDefinition, TOOL_REGISTRY } from '../src/agents/toolRegistry';
import type { AgentActionDraft, AgentApproval } from '../src/domain/models';
import { loadSeedData } from '../src/repositories/seedLoader';

const CLINICIANS = new Set(['clinician-1', 'clinician-2']);

describe('tool registry', () => {
  it('contains no public-web, SQL, code-execution, or generic messaging tool', () => {
    const names = TOOL_REGISTRY.map((t) => t.name.toLowerCase());
    for (const forbidden of ['web', 'sql', 'exec', 'shell', 'http', 'sendsms', 'sendemail']) {
      expect(names.some((n) => n.includes(forbidden))).toBe(false);
    }
  });

  it('marks every mutating tool idempotent', () => {
    for (const tool of TOOL_REGISTRY.filter((t) => t.mutating)) {
      expect(tool.idempotent).toBe(true);
    }
  });

  it('requires approval for every execution tool', () => {
    for (const name of [
      'sendApprovedPatientMessage',
      'scheduleApprovedFollowUp',
      'recordClinicianConfirmedContact',
      'resolveAlert',
    ]) {
      expect(getToolDefinition(name)?.permission).toBe('approval_required');
    }
  });
});

describe('checkToolPermission', () => {
  const scope = { runPatientId: 'patient-1' };

  it('prohibits any tool that is not in the registry', () => {
    for (const name of [
      'searchPublicWeb',
      'expandShareGrantScope',
      'promoteRecordAuthority',
      'runSql',
    ]) {
      const decision = checkToolPermission(name, scope);
      expect(decision).toMatchObject({ permission: 'prohibited', allowed: false });
    }
  });

  it('refuses cross-patient tool calls regardless of tool permission', () => {
    const decision = checkToolPermission('getRecentCheckIns', {
      runPatientId: 'patient-1',
      argumentPatientId: 'patient-2',
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('outside the run scope');
  });

  it('refuses approval-required execution without a valid approval', () => {
    const decision = checkToolPermission('sendApprovedPatientMessage', scope);
    expect(decision).toMatchObject({ permission: 'approval_required', allowed: false });
  });

  it('allows approval-required execution with a valid approval', () => {
    const decision = checkToolPermission('sendApprovedPatientMessage', {
      ...scope,
      approvalId: 'approval-1',
    });
    expect(decision.allowed).toBe(true);
  });
});

describe('approval binding', () => {
  const draft: AgentActionDraft = {
    id: 'draft-1',
    agentRunId: 'run-1',
    type: 'draft_patient_message',
    version: 2,
    payload: { en: 'x', sw: 'y' },
    evidenceReferences: [{ type: 'rule', id: 'r-1' }],
    approvalRequired: true,
    status: 'awaiting_approval',
  };
  const approval: AgentApproval = {
    id: 'approval-1',
    actionDraftId: 'draft-1',
    actionDraftVersion: 2,
    reviewerClinicianId: 'clinician-1',
    decision: 'approved',
    decidedAt: '2026-08-25T09:00:00.000Z',
  };

  it('accepts an approval bound to the exact draft version by an authorized clinician', () => {
    expect(validateApprovalForExecution(draft, approval, CLINICIANS)).toEqual({ valid: true });
  });

  it('rejects execution without an approval', () => {
    expect(validateApprovalForExecution(draft, undefined, CLINICIANS).failure).toBe(
      'approval_missing',
    );
  });

  it('invalidates the approval when the payload is edited (version changes)', () => {
    const edited = editDraftPayload(draft, { en: 'new', sw: 'mpya' });
    expect(edited.version).toBe(3);
    expect(validateApprovalForExecution(edited, approval, CLINICIANS).failure).toBe(
      'version_mismatch',
    );
  });

  it('rejects a rejected decision, an unauthorized reviewer, and an agent reviewer', () => {
    expect(
      validateApprovalForExecution(draft, { ...approval, decision: 'rejected' }, CLINICIANS)
        .failure,
    ).toBe('decision_not_approving');
    expect(
      validateApprovalForExecution(
        draft,
        { ...approval, reviewerClinicianId: 'stranger' },
        CLINICIANS,
      ).failure,
    ).toBe('reviewer_not_authorized');
    expect(
      validateApprovalForExecution(
        draft,
        { ...approval, reviewerClinicianId: 'agent-post-care' },
        CLINICIANS,
      ).failure,
    ).toBe('reviewer_is_agent');
  });
});

describe('DemoAgentRuntime replay of seeded runs', () => {
  const seed = loadSeedData();
  const runtime = new DemoAgentRuntime(seed.agentRuns, CLINICIANS);

  it('replays every fixture with zero policy violations', async () => {
    for (const fixture of seed.agentRuns) {
      const result = await runtime.replayRun(fixture.run.id);
      expect(result.policyViolations).toEqual([]);
      expect(result.simulated).toBe(true);
    }
  });

  it('reproduces the expected ordered tool calls and outcomes', () => {
    for (const fixture of seed.agentRuns) {
      const result = replayFixture(fixture, CLINICIANS);
      expect(result.toolCalls.map((c) => c.toolName)).toEqual(fixture.expectedOrderedToolNames);
      expect(result.outcome).toBe(fixture.expectedOutcome);
      for (const expected of fixture.expectedPermissionDecisions) {
        const actual = result.toolCalls.find((c) => c.toolName === expected.toolName);
        expect(actual).toMatchObject({
          permission: expected.permission,
          allowed: expected.allowed,
        });
      }
    }
  });

  it('records the adversarial fixtures as refused, never executed', () => {
    const byId = (id: string) => seed.agentRuns.find((f) => f.id === id)!;

    const injection = replayFixture(byId('ar-11-prompt-injection'), CLINICIANS);
    const unauthorizedSend = injection.toolCalls.find(
      (c) => c.toolName === 'sendApprovedPatientMessage',
    );
    expect(unauthorizedSend?.allowed).toBe(false);
    expect(injection.outcome).toBe('blocked_by_safety_policy');

    const crossPatient = replayFixture(byId('ar-12-cross-patient'), CLINICIANS);
    const foreignRead = crossPatient.toolCalls.find((c) => c.toolName === 'getRecentCheckIns');
    expect(foreignRead?.allowed).toBe(false);

    const widenGrant = replayFixture(byId('ar-13-widen-grant'), CLINICIANS);
    const widen = widenGrant.toolCalls.find((c) => c.toolName === 'expandShareGrantScope');
    expect(widen).toMatchObject({ permission: 'prohibited', allowed: false });

    const promote = replayFixture(byId('ar-14-promote-authority'), CLINICIANS);
    const promotion = promote.toolCalls.find((c) => c.toolName === 'promoteRecordAuthority');
    expect(promotion).toMatchObject({ permission: 'prohibited', allowed: false });
    expect(promote.outcome).toBe('blocked_by_safety_policy');
  });

  it('validates the executed approval path end to end', () => {
    const executed = seed.agentRuns.find((f) => f.id === 'ar-06-approved-executed')!;
    const result = replayFixture(executed, CLINICIANS);
    const send = result.toolCalls.find((c) => c.toolName === 'sendApprovedPatientMessage');
    expect(send).toMatchObject({ permission: 'approval_required', allowed: true });
    expect(result.outcome).toBe('approved_action_executed');
  });
});
