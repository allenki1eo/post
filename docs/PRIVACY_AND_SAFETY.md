# Privacy and Safety

POST handles sensitive health information by design, so the hackathon build
uses **synthetic data only**, marked `DEMO - SYNTHETIC DATA` on clinician
surfaces and `synthetic: true` on every record (test-enforced).

## Safety boundary (implemented now)

- Workflow statuses are priorities, never diagnoses; the UI carries the
  "Workflow priority, not a diagnosis" note.
- The app never tells a patient to start/stop/change medication, never
  declares treatment success/failure, never invents missing information
  (missing renders as "not available" / dataAbsentReason).
- Urgent instructions are clinician-authored sample text, shown locally and
  never delayed behind a model.
- Patient-reported and AI-organized records can never become
  clinician-verified (`src/domain/provenance.ts`).
- Conflicting records are preserved side by side for human reconciliation.
- Every alert and agent fact carries resolvable evidence references; the
  safety verifier blocks unsupported claims (`src/domain/safety.ts`).
- Patient disclaimer (both languages): POST does not provide emergency care
  or replace a clinician.

## Sharing safeguards (implemented now)

- Share tokens are opaque, unambiguous-alphabet strings; only SHA-256
  hashes are stored (`src/domain/passport.ts`).
- QR payload = the opaque token, nothing else; a guard rejects anything
  outside the token alphabet.
- Grants are category-scoped, time-limited, use-limited, revocable;
  expired/revoked/over-used/unknown tokens return non-disclosing denials
  revealing no patient existence.
- Access events (allowed and denied) are recorded for the patient.
- Revocation cannot recall photographed/exported copies; the share flow
  must say so before confirmation (Milestone 4 UI).

## Secrets and configuration

- `.env.example` contains names only; nothing secret ships in the bundle.
- No model, messaging, database, signing, token-pepper, or notification
  credential may ever appear in an `EXPO_PUBLIC_` variable; they belong on
  a trusted backend, alongside the live agent runtime.
- Tokens (when real auth arrives) go in SecureStore, short-lived.

## Required before any real pilot (not started)

Qualified legal, privacy, security, and clinical review for the intended
country and clinics — for Tanzania specifically: the Personal Data
Protection Act, controller/processor registration, data-protection impact
assessment, hosting-location and cross-border transfer requirements
(primary source: https://pdpc.go.tz/). Plus: informed consent and
withdrawal flows, reviewed bilingual consent text, retention/deletion
policy, device-lock and session-timeout behavior, export/correction
workflows, incident response, verified recipient identity for
cross-facility access, encryption at rest, server-enforced authorization
and tenant isolation, redacted observability (no patient answers in crash
reports or analytics), `Cache-Control: no-store` and strict CSP on shared
routes with no third-party scripts. This document is not legal advice.
