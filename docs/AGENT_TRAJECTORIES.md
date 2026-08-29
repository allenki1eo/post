# Agent Trajectories

Significant agent design decisions and the seeded sample traces
(`data/synthetic-agent-runs.json`, replayed and policy-checked by
`DemoAgentRuntime` + `tests/agentPolicy.test.ts`).

## Design decisions

1. **One agent, two jobs.** Follow-up review and Care Passport organization
   share one bounded agent contract. No evidence yet justifies separate
   agents with separate permissions.
2. **Replay-first runtime.** The demo runtime replays recorded traces
   *through* the real permission checker, so a fixture that claims an
   unauthorized call succeeded fails the test suite. This keeps the demo
   honest and gives the future server runtime an executable policy spec.
3. **Deterministic core, model as garnish.** Adherence, rule evaluation,
   grant enforcement, and urgent handling are ordinary code. The model can
   only add drafts and summaries, gated by schema + safety verifier +
   approvals.
4. **Approval = version binding.** Pause/resume is modeled as an action
   draft with a version; approvals bind to that exact version and edits
   invalidate them.

## Seeded trajectories (15)

| ID | Trigger | Outcome | Demonstrates |
|---|---|---|---|
| ar-01-ontrack | check_in_submitted | no_review_needed | Benign check-in, deterministic path |
| ar-02-review | check_in_submitted | review_item_created | Low adherence rule, evidence-linked |
| ar-03-urgent | check_in_submitted | urgent_review_item_created | Urgent rule; local urgent instructions shown before any model |
| ar-04-missed | check_in_missed | review_item_created | Missed check-in rule |
| ar-05-awaiting-approval | check_in_submitted | awaiting_clinician_approval | Draft patient message pauses the run |
| ar-06-approved-executed | check_in_submitted | approved_action_executed | Edit-and-approve, resume, execute exactly once |
| ar-07-rejected | check_in_submitted | review_item_created | Rejection leaves only the internal review item |
| ar-08-passport-summary | passport_summary_requested | passport_summary_created | Cited summary, conflict flagged not resolved |
| ar-09-plan-changed | care_plan_changed | no_review_needed | Deterministic reminder rescheduling |
| ar-10-abstained | clinician_requested_review | abstained_missing_information | Missing inputs → abstention |
| ar-11-prompt-injection | check_in_submitted | blocked_by_safety_policy | Note-as-instructions attack treated as data; unapproved send refused |
| ar-12-cross-patient | clinician_requested_review | blocked_by_safety_policy | Cross-patient read refused by scope enforcement |
| ar-13-widen-grant | passport_summary_requested | passport_summary_created | Grant-widening tool absent from registry; scope preserved |
| ar-14-promote-authority | clinician_requested_review | blocked_by_safety_policy | Authority promotion permanently prohibited |
| ar-15-recoverable-failure | check_in_submitted | failed_recoverably | Bounded retries, idempotent re-queue |

All five triggers and all nine terminal outcomes are covered; model-enabled
and model-disabled paths are both represented
(`modelDisabledPathEquivalent`).
