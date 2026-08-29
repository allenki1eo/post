# Interoperability

POST keeps an internal canonical record model and maps **toward** FHIR R4
and the HL7 International Patient Summary. This is a compatibility
direction; POST claims no FHIR or IPS certification or conformance, and the
IPS-shaped export says so in its Composition title.

Implementation: pure functions in `src/interoperability/` — no I/O, no raw
FHIR handed to screen components. Tests: `tests/fhirMapping.test.ts`.

## Mapping directions

| POST concept | FHIR R4 resource |
|---|---|
| Patient | `Patient` |
| Medication history record | `MedicationStatement` (reversible round-trip for emitted fields) |
| Allergy record | `AllergyIntolerance` |
| Condition record | `Condition` |
| Encounter record | `Encounter` |
| Procedure record | `Procedure` |
| Observation record | `Observation` (missing value → `dataAbsentReason`, never invented) |
| Document record | `DocumentReference` |
| Clinician advice / care-plan record | `CarePlan` |
| Important alert | `Flag` |
| Record provenance | `Provenance` |
| Share grant | `Consent` (categories → provision.class, window → provision.period) |
| Passport snapshot | FHIR document `Bundle` shaped toward IPS (`ipsMapper.ts`) |

Not yet mapped (future milestones): Practitioner/PractitionerRole,
Organization, MedicationRequest, DiagnosticReport, full Encounter detail.

## Provenance preservation

Every mapped resource carries:

- `identifier` with the POST record id
  (`https://post.example/fhir/record-id`) and, when imported, the source
  organization's own record identifier;
- `meta.tag` codes for source authority
  (`https://post.example/fhir/source-type`) and verification state
  (`.../verification-status`);
- a `synthetic` tag on all demo data.

## Import quarantine

`importClinicalRecords` (`validation.ts`) parses each incoming record with
the canonical Zod schema. Malformed records, records not carrying
`facility_imported` authority, and records arriving "pre-verified" are
quarantined with their issues — never partially accepted, never silently
dropped. Verification of an import requires a local clinician.

## IPS-shaped export

`buildIpsShapedBundle` produces `Bundle(type=document)` with a Composition
first (LOINC 60591-5), sections per passport category with English or
Kiswahili titles, followed by the mapped resources and their Provenance
entries. Only records in the snapshot are included.

References: [HL7 IPS](https://hl7.org/fhir/uv/ips/),
[FHIR R4](https://hl7.org/fhir/R4/),
[FHIR Consent](https://hl7.org/fhir/R4/consent.html),
[FHIR Provenance](https://hl7.org/fhir/R4/provenance.html).
