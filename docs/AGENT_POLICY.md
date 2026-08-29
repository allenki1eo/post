# POST Care Agent Policy

One bounded, event-driven agent. Not a chatbot, not multiple named agents.
The mobile app never runs the model tool loop and never holds provider
secrets; in demo mode `DemoAgentRuntime` (`src/agents/DemoAgentRuntime.ts`)
replays deterministic seeded traces while enforcing the same policies the
future `ServerAgentRuntime` must enforce on a trusted backend.

## Triggers

`check_in_submitted`, `check_in_missed`, `care_plan_changed`,
`clinician_requested_review`, `passport_summary_requested`. Nothing else
starts a run. Every run is scoped to exactly one patient and one authorized
task.

## Permission table (enforced in `src/agents/permissions.ts`)

| Action | Permission |
|---|---|
| Read scoped care-plan / check-in / passport data | Automatic |
| Deterministic adherence calculation | Automatic (a model never calculates adherence) |
| Evaluate clinician-approved rules | Automatic |
| Build/validate evidence bundles, internal review items, action drafts | Automatic |
| Create `ai_organized` passport summary | Automatic, always source-labeled |
| Schedule a reminder already authorized by the active plan | Automatic via deterministic scheduling |
| Send a custom patient message | Clinician approval required |
| Schedule a clinician follow-up | Clinician approval required |
| Record that a patient was contacted | Clinician confirmation required |
| Resolve an urgent alert | Clinician approval required |
| Widen a Care Passport share grant | Patient confirmation required; the agent has no tool for this |
| Diagnose, prescribe, change dose, stop medicine, declare outcome | Permanently prohibited |
| Promote patient-reported / AI-organized data to clinician-verified | Permanently prohibited |
| Public web, unrestricted SQL, code execution, generic messaging, other patients' records | Tool unavailable (allowlist) |

The registry (`src/agents/toolRegistry.ts`) is a strict allowlist: an
unregistered tool name is `prohibited` — there is no default-allow path.
Every tool declares a Zod input schema, mutating/idempotency flags, and a
timeout. All mutating tools are idempotent.

## Approval binding (`src/agents/approvalStore.ts`)

- An approval binds to one exact action-draft **version**.
- Editing a payload increments the version and invalidates prior approvals.
- Reviewers must be authorized clinicians; an agent identity can never
  approve (self-approval is structurally rejected).
- Execution tools reject calls without a valid approval + matching draft +
  idempotency key.
- The safety verifier runs before the approval request and again before
  approved execution.

## Safety gates (`src/domain/safety.ts`)

- Every fact must cite evidence inside the run's bundle; unresolvable
  references are violations.
- Forbidden-claim heuristics reject diagnosis, medication advice,
  prescribing language, and treatment verdicts (patterns are demo heuristics
  pending clinical review — see `docs/CLINICAL_REVIEW.md`).
- A model suggestion can never downgrade a deterministic urgent result.
- Missing required inputs force abstention; invention is a violation.
- Patient notes, imported documents, and FHIR narratives are untrusted
  data, never instructions (seeded adversarial fixtures: `ar-11` prompt
  injection, `ar-12` cross-patient, `ar-13` grant widening, `ar-14`
  authority promotion — all refused, verified by `tests/agentPolicy.test.ts`).

## Terminal outcomes

`no_review_needed`, `review_item_created`, `urgent_review_item_created`,
`awaiting_clinician_approval`, `approved_action_executed`,
`passport_summary_created`, `abstained_missing_information`,
`blocked_by_safety_policy`, `failed_recoverably`. All nine are covered by
seeded runs and replay tests.

## Model posture

Disabled by default (`EXPO_PUBLIC_ENABLE_CARE_AGENT=false`). Every core
demo journey works with the model disabled via deterministic rules and the
seeded traces. When a live model arrives (Milestone 5) it sits behind a
provider-neutral interface on the backend, with schema-constrained output
(`SafeAgentOutput`), versioned prompts, and provider metadata recorded on
each `AgentRun`. Urgent local instructions and urgent rule matching never
depend on model availability.
