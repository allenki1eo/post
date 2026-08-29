# Data Dictionary

Canonical model: `src/domain/schemas.ts` (Zod, source of truth) with types
derived in `src/domain/models.ts`. IDs are opaque UUID-style strings;
timestamps are UTC ISO 8601, rendered in the user's timezone.

## Enumerations

| Type | Values | Notes |
|---|---|---|
| `Role` | patient, clinician, clinic_admin | |
| `WorkflowStatus` | on_track, review, urgent | Workflow priorities, never diagnoses |
| `SyncStatus` | local, syncing, synced, failed | Patient-visible sync state |
| `SupportedLanguage` | en, sw | Equal first-class languages |
| `RecordSourceType` | clinician_verified, facility_imported, patient_reported, ai_organized | Source authority; never promoted by the agent |
| `VerificationStatus` | verified, pending, disputed, superseded, unverified | superseded is terminal |
| `AgentTrigger` | check_in_submitted, check_in_missed, care_plan_changed, clinician_requested_review, passport_summary_requested | |
| `AgentRunState` | created → collecting_context → calling_tools → verifying → awaiting_approval → executing_approved_action → completed / abstained / blocked / failed | |
| `AgentOutcome` | nine terminal outcomes (see AGENT_POLICY.md) | |
| `PassportCategory` | important_alerts, medications, allergies, conditions, encounters, procedures, care_plans, clinician_advice, observations, documents | Share-grant scoping unit |

## Key entities

- **CarePlanTemplate** — versioned; bilingual questions
  (`CheckInQuestion`), `ScheduleDefinition`, deterministic `WorkflowRule`s
  (discriminated-union conditions: answer_equals / answer_gte / answer_lte /
  adherence_below / missed_check_ins / condition_worse_streak), and a
  `ClinicalReviewRecord` carrying the demo label.
- **CarePlan** — patient instance; exact clinician wording in
  `MedicationInstruction.clinicianWording`; activation requires clinician id
  + timestamp.
- **CheckInResponse** — answers + `expectedDoseIds` / `confirmedDoseIds`;
  schema enforces confirmed ⊆ expected. Dose id format:
  `<instructionId>@YYYY-MM-DDTHH:mm`.
- **Alert** — workflow item with ≥1 `EvidenceReference`, source
  (`deterministic_rule` | `model_suggestion`), review state.
- **EvidenceReference** — `{type, id}` where type ∈ check_in, answer,
  medication_confirmation, adherence_calculation, rule, care_plan,
  clinical_record, schedule, agent_step.
- **ClinicalRecord** — discriminated union over `PassportCategory`; every
  record carries source type, verification status, recorded timestamp,
  provenance link, `synthetic` flag; `disputesRecordId` links patient
  corrections; `supersedesRecordId` links replacements.
- **RecordProvenance** — created / imported / verified / corrected /
  superseded with actor/organization.
- **CarePassportSnapshot** — record ids, bilingual missing-information
  warnings, conflict groups (must equal `findRecordConflicts` output).
- **ShareGrant** — stores only `tokenHash` (SHA-256); categories, purpose,
  window, `maxUses`/`useCount`, revocation.
- **PassportAccessEvent** — allowed / expired / revoked / over_use_limit /
  denied; drives the patient-visible access history.
- **AgentRun / AgentStep / AgentToolCall** — full trace: state transitions,
  tool calls with redacted arguments + permission + allowed flag, safety
  checks, notes; model/provider/prompt metadata when a model participated.
- **AgentActionDraft (versioned) / AgentApproval** — approval binds to the
  exact draft version; edits increment the version.
- **AuditEvent** — append-only.
- **ConsentRecord / Notification / Clinic / Clinician / User / Patient** —
  see schemas.

## Data invariants (tested)

All invariants from specification §10 are enforced in schema or code and
covered in `tests/` — notably: adherence `confirmed/expected` with
`not_applicable` for zero expected; no inferred doses; ≥1 evidence per
alert; no authority promotion; conflicts preserved (no last-write-wins);
token-hash-only storage; non-disclosing grant denials; no self-approval;
version-bound approvals; append-only audit.
