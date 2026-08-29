# Changelog

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
