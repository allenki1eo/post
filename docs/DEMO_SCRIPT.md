# Demo Script (Milestone 0/1 state)

Everything shown is synthetic; the clinician surfaces carry the
`DEMO - SYNTHETIC DATA` banner throughout.

## Setup

```bash
npm install
npm run web        # or: npm start and open Expo Go
```

## Walkthrough (~4 minutes)

1. **Welcome** — switch language between English and Kiswahili with the
   chips; the whole screen updates immediately, including the patient safety
   disclaimer. Choice persists across restarts.
2. **Patient — Today** — synthetic patient greeting, "Day X of Y" for the
   active minor-procedure plan, one primary action (Start check-in —
   wizard lands in Milestone 2), medication tasks in the exact clinician
   wording, bilingual.
3. **Patient — Progress** — doses shown as a fraction ("4 / 4"), with
   "Discuss this with your clinician" instead of interpretation.
4. **Patient — Passport** — source-labeled sections: clinician verified,
   facility imported, patient reported (disputed correction), AI-organized
   summary with its honesty label; "may not include every record" note.
5. **Patient — Help** — clinician-authored urgent instructions (sample
   text), clinic contact, privacy note.
6. **Clinician — Home** — active plans / review / urgent counts derived
   live from the deterministic rule engine over the 12 seeded cases.
7. **Clinician — Reviews** — urgent before review; every row shows the
   exact rule and its evidence references (check-in, answer, adherence).
8. **Clinician — Templates** — the four versioned templates, each labeled
   `FOR DEMONSTRATION - CLINICAL REVIEW REQUIRED`.
9. **Terminal** — `npm test`: 101 tests covering adherence edge cases,
   rule precedence, share-grant policy (expired/revoked/over-use/denied are
   non-disclosing), agent permission enforcement, the four adversarial agent
   fixtures (prompt injection, cross-patient, grant widening, authority
   promotion — all refused), FHIR round-trip and import quarantine, and
   en/sw key parity.

## What is deliberately not in this demo yet

Check-in wizard and offline outbox (M2), clinician detail/assign/decision
flows (M3), share-grant creation UI and receiving view (M4), live agent
runtime (M5). The domain logic, seeds, and policies behind all of them are
already in place and tested.
