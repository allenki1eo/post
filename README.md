# POST — Patient Outcomes & Support Tracker

Mobile prototype for follow-up, continuity-of-care, and workflow support:
clinicians assign structured follow-up plans, patients complete short daily
check-ins (offline-friendly), a bounded care agent organizes evidence into a
clinician review queue, and a patient-controlled Care Passport shares a
concise, source-labeled history across facilities.

**Synthetic data only.** Every person and medical event in this repository
is synthetic. POST does not diagnose, prescribe, change treatment, or
replace professional judgment. Workflow statuses (`on_track` / `review` /
`urgent`) are priorities, never diagnoses. All clinical rules and Kiswahili
wording are demonstration content pending qualified review
(`docs/CLINICAL_REVIEW.md`).

## Stack

Expo SDK 57 · React Native · TypeScript · Expo Router · Zod · i18next
(English + Kiswahili as equal first-class languages) · date-fns · Jest +
jest-expo + React Native Testing Library.

## Getting started

```bash
npm install
npm start          # Expo dev server (i = iOS simulator, a = Android, w = web)
npm run web        # web directly
```

Environment flags: copy `.env.example` (names only, no secrets ever in
`EXPO_PUBLIC_` variables).

## Quality gates

```bash
npm run typecheck  # tsc --noEmit
npm run lint       # expo lint
npm test           # 101 unit + component tests
npm run format     # prettier check
```

## Project layout

```
src/app/               Expo Router routes: (auth), (patient), (clinician), share/
src/components/        ErrorBoundary + accessible primitives (design system)
src/domain/            Zod schemas, models, adherence, workflow rules,
                       share-grant policy, provenance, safety verifier
src/repositories/      Repository interface, DemoRepository (validated seeds),
                       ApiRepository (typed stub for the future backend)
src/agents/            Allowlisted tool registry, permission policy, approval
                       binding, DemoAgentRuntime (replayable, policy-enforcing)
src/interoperability/  Pure FHIR R4 mappings, IPS-shaped export, import quarantine
src/i18n/              en/sw bundles (parity-tested), glossary
src/theme/             Design tokens (docs/DESIGN_SYSTEM.md)
data/                  Synthetic seeds: 4 templates, 12 follow-up cases,
                       4 Care Passports, 15 agent runs (tools/generate-seeds.mjs)
docs/                  Design system & QA, agent policy & trajectories,
                       clinical-review register, data dictionary, privacy,
                       interoperability, demo script
tests/                 Jest suites for all of the above
```

## Architecture rules (short version)

- Screens never read seed JSON or storage directly: UI → domain services →
  `Repository` interface (`DemoRepository` now, `ApiRepository` later).
- The mobile app never runs a model tool loop and never holds provider
  secrets; `DemoAgentRuntime` replays deterministic traces while enforcing
  the same permissions a future server runtime must enforce.
- Deterministic code owns adherence, urgent rules, grant enforcement, and
  safety gates; a model (disabled by default) can only propose drafts that
  clinicians approve.

## Status

Milestones 0 and 1 of the build specification are complete; see
`CHANGELOG.md` and `docs/DEMO_SCRIPT.md`. Next: Milestone 2 (patient
follow-up journey: check-in wizard, SQLite outbox, offline sync states,
local notifications).
