# Changelog

## Improvement Changelog — Agentic Workflows Hackathon

This section is the hackathon report. It separates the starting workflow from
the agent-assisted workflow, connects claims to committed evidence, and gives a
clean-environment reproduction path. The version history below remains the
technical release log.

### The problem and the people who have it

**Who:** patients continuing treatment away from a clinic, and the clinicians
responsible for reviewing their follow-up. The demonstration focuses on four
common journeys: hypertension, diabetes, post-operative recovery, and maternal
postpartum care. Every case and clinical event in the repository is synthetic.

**Bottleneck:** a clinician cannot continuously review every dose confirmation,
missed check-in, symptom answer, note, and record conflict. A simple automation
can reduce sorting work, but in this setting a plausible unsupported statement,
an urgent downgrade, a cross-patient read, or an unapproved outbound message is
more harmful than a slow queue. The useful task is therefore not “give medical
advice”; it is **organize scoped evidence into an explainable review item while
leaving consequential decisions with a qualified clinician**.

**Why solving it is valuable:** patients receive timely, clinic-authored
instructions and reminders, while clinicians receive a prioritized,
evidence-linked queue rather than an opaque risk score. The bounded care agent
does not diagnose, prescribe, change treatment, or replace clinical judgment.

### What existed before this hackathon work

The starting point was a manual follow-up pattern: staff review reports one at
a time, calculate adherence, decide priority, compose messages, and reconcile
records. There was no executable baseline agent in the repository and no
measured timing or cost study. We therefore do **not** claim an invented
percentage improvement over human work. The reproducible engineering baseline
for this submission is the deterministic rule-only path; the agent is evaluated
on whether it preserves those results while safely organizing the evidence and
drafting only permitted actions.

### Primary evaluation

The primary metric is **policy-correct trajectory completion**: the number of
fixed synthetic trajectories whose terminal outcome and tool permissions match
the committed expectation when replayed through the real policy checker. A good
final result was defined before the final run as **15/15**, including all nine
terminal outcomes and the four adversarial cases. This metric measures
reliability and containment; it does not measure clinical effectiveness.

| Metric | Simple baseline | Agent solution | Change |
|---|---:|---:|---:|
| Policy-correct executable trajectories | No executable agent baseline | 15/15 | Automation added with every committed trajectory passing |
| Terminal outcomes represented | 0 | 9/9 | Full declared outcome set covered |
| Explicit adversarial cases refused | 0 executable cases | 4/4 | Prompt injection, cross-patient access, grant widening, and authority promotion refused |
| Complete automated test suite | 101 tests / 10 suites at v0.1.0 | 145 tests / 15 suites at v0.3.0 | +44 tests and +5 suites |
| Human time per task | Not measured | Not measured | No claim |
| Model/API cost per replay | Not applicable | $0 in demo replay mode | No live model call |

The same 15 fixtures are parsed from `data/synthetic-agent-runs.json` and
replayed by `tests/agentPolicy.test.ts`. The challenging case was prompt
injection (`ar-11`): a patient note contains instructions directed at the
agent. Treating the note as data—not instructions—and requiring approval for
message delivery caused the attempted unapproved send to be refused. The three
other adversarial fixtures test patient-scope isolation, grant boundaries, and
source-authority boundaries. See `docs/AGENT_TRAJECTORIES.md` for the readable
index and `docs/AGENT_POLICY.md` for the policy being exercised.

### Evolution and evidence

| Stage | What we tried and why | Evidence using the evaluation above | Decision / learning |
|---|---|---|---|
| Baseline | Kept adherence, urgency rules, and queue decisions as direct deterministic code instead of asking a general-purpose agent to infer them. | `tests/adherence.test.ts`, `tests/workflowRules.test.ts`, and `tests/safety.test.ts` establish the rule-only reference behavior; no executable model baseline existed. | Kept. Clinical priority needs an inspectable reference path, not a prompt-only baseline. |
| Iteration 1 — structured context | Added versioned care-plan templates, evidence references, provenance, and a single patient/task scope so the agent receives only the context needed for one run. | The initial v0.1.0 gate passed 101 tests in 10 suites; synthetic seeds cover 12 follow-up cases and 15 agent runs. | Kept. Better structure mattered more than giving the agent broader access. |
| Iteration 2 — tool permissions | Added a strict tool allowlist with Zod inputs and automatic / approval-required / prohibited permissions. Custom messages and clinical follow-ups pause for human approval. | All 15 trajectory fixtures replay through the permission checker; cross-patient access and prohibited authority promotion are rejected in `tests/agentPolicy.test.ts`. | Kept. Default-deny tools turn the agent contract into an executable boundary. |
| Iteration 3 — verification | Added deterministic evidence resolution, forbidden-claim checks, urgent-downgrade prevention, forced abstention for missing inputs, and a second verification before approved execution. | The safety and policy suites pass the abstention, prompt-injection, urgent, evidence, and approval-version cases. | Kept. Verification must be independent of the component producing the draft. |
| Iteration 4 — replay-first orchestration | Replaced live-model execution in the mobile demo with deterministic trace replay through the real policy layer. Core workflows remain available when the model is disabled. | `modelDisabledPathEquivalent` is represented in the seed data; the test run costs $0 in model/API usage and produces repeatable outcomes. | Kept for submission. It is less flashy than a live loop but more reproducible and does not expose credentials or patient data. |
| Removed experiment — agent-controlled clinical logic | Considered letting a model calculate adherence and choose or downgrade clinical priority. | This could not preserve the deterministic urgent guarantee or yield an auditable clinical reference result. The tool is absent and the actions are prohibited in `docs/AGENT_POLICY.md`. | Removed. Consequential clinical logic should not become agentic merely to increase the agent count. |
| Iteration 5 — useful delivery | Added offline check-ins, exactly-once outbox sync, local private-by-default reminders, and a trusted-backend Swala adapter for consented SMS. | v0.2.0 recorded 142 tests; the current suite has 145, including request-contract, E.164, idempotency, and redacted-error checks in `tests/swalaSms.test.ts`. | Kept. The agent output becomes useful only when the surrounding delivery path is reliable and consent-aware. Live SMS remains a human-controlled backend action, not part of demo replay. |
| Final | Combined scoped context, deterministic clinical rules, allowlisted tools, version-bound approval, independent verification, offline delivery, and replayable trajectories. | `npm test -- --runInBand`: 145/145 tests across 15 suites; agent subset: 15/15 trajectories, 9/9 outcomes, and 4/4 adversarial refusals. | The main contribution is a bounded workflow in which the agent organizes evidence without owning medical truth or consequential execution. |

### Reproduction guide

From a clean checkout, use Node.js 20+ and npm 10+. Installation time depends
on the package registry; on a typical development machine the deterministic
evaluation should complete in under one minute after dependencies are present.
Demo replay makes no paid model or SMS API calls, so its expected provider cost
is $0.

```bash
# 1. Install exactly the committed dependency graph.
npm ci

# 2. Baseline/reference checks: deterministic clinical behavior.
npx jest tests/adherence.test.ts tests/workflowRules.test.ts tests/safety.test.ts --runInBand

# 3. Agent evaluation: all 15 fixed trajectories and adversarial cases.
npx jest tests/agentPolicy.test.ts --runInBand

# 4. Full final quality gate.
npm run typecheck
npm test -- --runInBand
npm run lint
npm run format

# 5. Optional runnable UI (uses synthetic data and replay mode by default).
npm run web
```

Expected agent result: `tests/agentPolicy.test.ts` passes, including the loop
over all 15 schema-valid fixtures. Expected full result for this revision: 145
tests in 15 suites. Expo lint currently reports two warnings in
`src/i18n/index.ts` and no errors. Do not configure a live Swala key to reproduce
the evaluation; `.env.example` intentionally contains names only.

### Human checkpoints and consequential actions

- A qualified clinician approves custom patient messages, follow-up scheduling,
  and urgent-alert resolution. Approval is bound to the exact draft version;
  edits invalidate it.
- The patient controls Care Passport sharing. The agent has no grant-widening
  tool and cannot promote patient- or AI-organized data to clinician-verified.
- Urgent instructions are authored by the clinic and evaluated locally without
  waiting for a model. SMS delivery requires verified contact details, explicit
  consent, approved neutral copy, and a trusted backend; no credential is
  committed.

### Main failure mode and hot take

The most important observed failure mode is **instruction-shaped clinical
data**: notes and imported narratives can look like commands to an agent. The
practical lesson is that prompt wording is not a security boundary. Treat
clinical text as untrusted data, scope every read, remove dangerous tools,
verify drafts against evidence, and bind human approval to the exact payload.

**Hot take:** in healthcare follow-up, the best agent is deliberately not in
the most important path. Deterministic code should own urgency, permissions,
provenance, and delivery idempotency; the agent earns its place by reducing the
work of organizing evidence, and must be able to abstain without blocking care.

### Submission artifact map

- Complete solution and agent instructions: `src/`, `docs/AGENT_POLICY.md`, and
  this Improvement Changelog.
- Reproduction and expected output: the commands above, `package-lock.json`,
  `.env.example`, and the README.
- Representative trajectories: `docs/AGENT_TRAJECTORIES.md` and
  `data/synthetic-agent-runs.json`.
- Evaluation implementation: `tests/agentPolicy.test.ts` plus the full `tests/`
  directory.
- Video: not stored in this repository; add the submission URL here before the
  hackathon deadline.

## [0.3.0] — 2026-08-31 — Consented messaging and optional AI resource

### Messaging and notifications

- Added a trusted-backend Swala SMS adapter for the documented quick-message
  endpoint, with bearer authentication, E.164 validation, stable idempotency
  keys, configurable sender ID, and provider errors that do not echo message
  content or phone numbers.
- Added a patient SMS-reminder preference, disabled by default. It records the
  user's local choice; a production backend must still verify the phone number
  and record explicit consent before sending.
- Added tests for the provider request contract, invalid recipients, and
  redacted failures. No live credential or real message is used by the suite.

### Optional AI resource

- Added a configurable external agent-free AI link to Help, hidden unless
  `EXPO_PUBLIC_AGENT_FREE_AI_URL` is set. The bilingual warning tells patients
  not to share private health details or use it for emergencies, diagnosis, or
  treatment decisions.
- The link is informational only and is not the bounded POST care agent. No AI
  provider credential is stored in the mobile app.

### Verification

- 145 tests across 15 suites pass, including the 15 policy-replayed agent
  trajectories and the new Swala adapter suite.
- Typecheck and formatting pass. Expo lint reports no errors and two existing
  import warnings in `src/i18n/index.ts`.

## [0.2.0] — 2026-08-29 — Milestone 2: patient follow-up journey

### Offline-first storage and sync

- Local persistence behind a `LocalStore` interface: SQLite on device
  (`SqliteLocalStore`, migrations with `PRAGMA user_version`), an in-memory
  store for Jest and the web demo. The store factory is split by platform
  extension so the native SQLite module never enters the web bundle.
- A submitted check-in and its outbox operation are committed in one
  transaction, then confirmed immediately — no connectivity required.
- Outbox operations are immutable and carry an idempotency key
  (`submit_check_in:<id>:r<revision>`), so retries can never create a
  duplicate check-in. Retries use bounded exponential backoff (2s/4s/8s/16s,
  then give up); a transport throw is treated as retryable rather than
  dropping the patient's data.
- `syncOnce` drains due operations and reflects the result in each check-in's
  patient-visible sync state. A server-side `duplicate` is success, not an
  error, which is what makes delivery exactly-once.

### Check-in journey

- Seven-step check-in wizard: dose confirmations, overall condition, the
  template's own symptom questions (one per view), an optional note, and a
  review step. All answers live in one component's state, so back navigation
  preserves them.
- Submitting evaluates the clinic's approved rules locally and shows the
  clinic-authored urgent instruction immediately — offline, and with no model
  in the path.
- Resubmitting identical answers is idempotent; editing before sync creates a
  new revision and a new operation, preserving history.
- A confirmation for a dose that was not expected today is dropped rather than
  recorded, and an unconfirmed dose is never inferred.

### Patient screens

- Today: live plan day, one primary action that reflects completion, doses
  confirmed as a fraction, the clinician's exact medication wording, and a
  sync badge that states the fact without blaming the user.
- Progress: check-in completion, dose fraction, and neutral counts of what the
  patient reported, with missing answers labeled missing rather than negative.
  A 0–10 scale is deliberately not summarized as a count.
- Profile: notification preferences, and an explicit second confirmation
  before signing out while check-ins are still unsynced.
- Today and Progress reload on focus, so returning from a check-in shows the
  new state.

### Notifications

- Local reminders planned from the active care plan (pure `planNotifications`),
  scheduled through an Expo adapter as a full replace so a plan or language
  change leaves no stale reminders.
- Medication reminders use the clinician's exact wording, but lock-screen text
  hides it by default — the medicine name appears only if the patient opts
  into previews. Check-in reminders are always neutral.
- A reminder tap deep-links to the task; the payload carries only a route.

### New primitives

`ChoiceRow` (radio/checkbox), `ScaleInput`, `StepProgress`, `TextField`,
`Banner`, `SyncBadge` — all with explicit states, 44pt targets, and room for
Kiswahili text expansion.

### Verification

- 142 tests across 14 suites (41 new), covering backoff bounds, idempotency,
  exactly-once sync, transport failure, local-day scheduling across offsets,
  urgent evaluation offline, notification privacy defaults, progress counting,
  and the wizard's back-preserves-answers, offline-submit, urgent-display,
  bilingual, and no-risk-score behavior.
- Typecheck, lint, and web export clean; screenshot QA in both languages
  recorded in `docs/DESIGN_QA.md` (Review 2), which caught three real bugs.

### Notes

- `DemoRepository.getActiveCarePlan` rebases the seeded plan window onto the
  current date so the synthetic demo is always mid-plan. This is demo-only and
  clearly labeled; seed files and the evaluation cases are untouched.


## [0.1.0] — 2026-08-29 — Milestones 0 & 1

### Foundation (Milestone 0)

- Expo SDK 57 + TypeScript + Expo Router app (`src/app`), runnable on iOS,
  Android, and web; ESLint (expo flat config), Prettier, Jest (jest-expo)
  wired with `typecheck` / `lint` / `test` / `format` scripts.
- Design tokens (`src/theme/tokens.ts`) and accessible primitives
  (AppText, Button, Screen, DemoBanner, StatusLabel, ListRow,
  SectionHeading, EmptyState) per the "clinical field notebook" direction;
  top-level ErrorBoundary; persistent `DEMO - SYNTHETIC DATA` banner on
  clinician surfaces.
- Ran the UI Skills routing flow and recorded the selected skill and its
  effects in `docs/DESIGN_QA.md`; authored `docs/DESIGN_SYSTEM.md`.
- Bilingual foundation: i18next + expo-localization with English and
  Kiswahili bundles under semantic keys, runtime switching persisted via
  AsyncStorage, glossary, and automated parity/interpolation/plural tests.
- Navigation shells with live seed data: welcome/sign-in, patient tabs
  (Today, Progress, Passport, Help, Profile), clinician tabs (Home,
  Patients, Reviews, Templates, Profile), read-only share route stub.
- `.env.example` (names only), README, this changelog.

### Domain & demo repository (Milestone 1)

- Canonical Zod schemas + derived TS models for the full domain (care
  plans, check-ins, evidence, alerts, clinical records with source
  authority/verification/provenance, share grants, access events, agent
  runs/steps/tool calls/action drafts/approvals, audit events, consent,
  notifications), enforcing the specification's data invariants (e.g.
  confirmed ⊆ expected doses, hash-only share tokens).
- Four versioned demonstration care-plan templates (bilingual questions,
  deterministic urgent/review rules, `FOR DEMONSTRATION - CLINICAL REVIEW
  REQUIRED` labels) generated by the committed `tools/generate-seeds.mjs`.
- Synthetic seeds: 12 follow-up cases (on_track/review/urgent × 4
  journeys), 4 Care Passports (all four source types, conflicting
  medication pair, patient correction kept separate, explicit
  not-available value, active/expired/revoked/over-use grants, allowed and
  denied access events), 15 agent runs (all 5 triggers, all 9 outcomes,
  prompt-injection / cross-patient / grant-widening / authority-promotion
  adversarial fixtures).
- Deterministic adherence calculator (fraction with `not_applicable` for
  zero expected; never infers doses) and explainable workflow-rule engine
  (urgent > review > on_track, evidence-linked matches, missing-data
  behavior).
- Care Passport share-grant policy: opaque token issuance, SHA-256
  hash-only storage, non-disclosing expired/revoked/over-use/denied
  outcomes, category+patient filtering, opaque-QR guard.
- Provenance rules (no authority promotion, agent/patient can never
  verify, conflict grouping without last-write-wins, patient corrections
  as separate disputed records) and a deterministic safety verifier
  (evidence resolution, forbidden clinical claims, urgent-downgrade block,
  forced abstention).
- Typed `Repository` interface, `DemoRepository` over schema-validated
  seeds (alerts derived live by the rule engine), stubbed `ApiRepository`
  mapped to the future API contract.
- One bounded agent contract: allowlisted tool registry with Zod inputs,
  permission policy (automatic / approval_required / prohibited +
  patient-scope enforcement), version-bound approval store, and
  `DemoAgentRuntime` that replays seeded traces through the real policy
  checks — no network, no model.
- Pure FHIR R4 mappings (medication round-trip, provenance/source tags
  preserved, missing values as dataAbsentReason), IPS-shaped document
  bundle (bilingual sections, non-conformance stated), malformed-import
  quarantine.
- 101 passing tests across 10 suites; typecheck and lint clean.

### Notes and deviations

- NativeWind, TanStack Query, Zustand, React Hook Form, SQLite, SecureStore,
  and Notifications are deliberately deferred to the milestones that need
  them (M2+); the foundation uses typed StyleSheet tokens and a minimal
  async hook so the dependency surface stays reviewable.
- The Expo SDK 57 template mounts routes at `src/app/` (spec layout shows
  root `app/`); kept the SDK convention.
- 15 agent-run fixtures instead of the minimum 12, to cover rejected,
  widen-grant, promote-authority, and recoverable-failure paths separately.
