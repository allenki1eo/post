/**
 * DemoAgentRuntime — deterministic replay of seeded POST Care Agent runs.
 *
 * The mobile app never runs a live model tool loop and never holds provider
 * secrets. In demo mode this runtime replays the synthetic traces bundled in
 * `data/synthetic-agent-runs.json`, and while replaying it re-enforces the
 * same policies the future `ServerAgentRuntime` must enforce on a trusted
 * backend:
 *
 * - every tool call is checked against the allowlisted registry;
 * - patient scope is checked per call;
 * - approval-required execution is validated against the exact action-draft
 *   version and an authorized clinician reviewer;
 * - a step recorded as allowed that policy would refuse fails the replay
 *   (the fixture is wrong, and tests catch it).
 */
import type {
  AgentApproval,
  AgentOutcome,
  AgentRun,
  AgentTrigger,
  SyntheticAgentRun,
} from '../domain/models';
import { validateApprovalForExecution } from './approvalStore';
import { checkToolPermission, type PermissionDecision } from './permissions';
import { getToolDefinition } from './toolRegistry';

export interface ReplayedToolCall extends PermissionDecision {
  /** What the recorded fixture said happened. */
  recordedAllowed: boolean;
  resultSummary?: string;
}

export interface ReplayResult {
  runId: string;
  trigger: AgentTrigger;
  outcome: AgentOutcome | undefined;
  toolCalls: ReplayedToolCall[];
  /** Fixture/policy disagreements — always empty for valid seed data. */
  policyViolations: string[];
  simulated: true;
}

export interface AgentRuntime {
  listRuns(): Promise<AgentRun[]>;
  replayRun(runId: string): Promise<ReplayResult>;
}

export class DemoAgentRuntime implements AgentRuntime {
  constructor(
    private readonly fixtures: readonly SyntheticAgentRun[],
    private readonly authorizedClinicianIds: ReadonlySet<string>,
  ) {}

  async listRuns(): Promise<AgentRun[]> {
    return this.fixtures.map((f) => f.run);
  }

  async replayRun(runId: string): Promise<ReplayResult> {
    const fixture = this.fixtures.find((f) => f.run.id === runId || f.id === runId);
    if (!fixture) {
      throw new Error(`Unknown demo agent run: ${runId}`);
    }
    return replayFixture(fixture, this.authorizedClinicianIds);
  }
}

export function replayFixture(
  fixture: SyntheticAgentRun,
  authorizedClinicianIds: ReadonlySet<string>,
): ReplayResult {
  const run = fixture.run;
  const toolCalls: ReplayedToolCall[] = [];
  const policyViolations: string[] = [];

  for (const step of run.steps) {
    if (step.kind !== 'tool_call' || !step.toolCall) {
      continue;
    }
    const call = step.toolCall;
    const args = call.argumentsRedacted;
    const argumentPatientId =
      typeof args.patientId === 'string' ? (args.patientId as string) : undefined;

    let approvalId: string | undefined;
    const definition = getToolDefinition(call.toolName);
    if (definition?.permission === 'approval_required') {
      approvalId = resolveValidApprovalId(
        typeof args.actionDraftId === 'string' ? (args.actionDraftId as string) : undefined,
        run,
        fixture.approvals,
        authorizedClinicianIds,
      );
    }

    const decision = checkToolPermission(call.toolName, {
      runPatientId: run.patientId,
      argumentPatientId,
      approvalId,
    });

    toolCalls.push({
      ...decision,
      recordedAllowed: call.allowed,
      resultSummary: call.resultSummary,
    });

    if (call.allowed && !decision.allowed) {
      policyViolations.push(
        `Step ${step.index} recorded ${call.toolName} as allowed, but policy refuses it: ${decision.reason}`,
      );
    }
    if (!call.allowed && decision.allowed) {
      policyViolations.push(
        `Step ${step.index} recorded ${call.toolName} as refused, but policy allows it`,
      );
    }
  }

  return {
    runId: run.id,
    trigger: run.trigger,
    outcome: run.outcome,
    toolCalls,
    policyViolations,
    simulated: true,
  };
}

function resolveValidApprovalId(
  actionDraftId: string | undefined,
  run: AgentRun,
  approvals: readonly AgentApproval[],
  authorizedClinicianIds: ReadonlySet<string>,
): string | undefined {
  if (!actionDraftId) {
    return undefined;
  }
  const draft = run.proposedActions.find((d) => d.id === actionDraftId);
  if (!draft) {
    return undefined;
  }
  const approval = approvals.find((a) => a.actionDraftId === actionDraftId);
  const result = validateApprovalForExecution(draft, approval, authorizedClinicianIds);
  return result.valid ? approval?.id : undefined;
}
