# POST — Post-Treatment Patient Care Continuity

## 1. Problem

After a patient is treated or discharged, care effectively stops until the next scheduled visit — if one happens at all. Patients stop taking medication once they feel better, complications go unreported, and doctors have no visibility into recovery between visits. In Tanzania this is compounded by transport cost and distance, which make return visits rare and follow-up inconsistent.

POST closes that gap. After treatment, the doctor logs the patient with a care plan. The patient gets reminders — medication and follow-up visits. The doctor gets a triage dashboard showing who needs attention.

## 2. Product model

- **Not** a doctor-discovery marketplace. Patients are not matching with new doctors.
- **Is** a continuity-of-care tool extending a relationship that began at treatment or discharge.
- **v1 is standalone.** No hospital ERP integration; doctors log patients manually. ERP integration is a post-traction, per-hospital feature (v2+).

## 3. Core flows

### Doctor

1. Log in → dashboard triaged by urgency (missed meds, flagged symptoms, upcoming visits), not a flat patient list.
2. Add a patient at discharge: name, phone, diagnosis, treatment summary.
3. Build a care plan: medications (name, dosage, schedule), red-flag symptoms, follow-up visit dates.
4. Review check-ins and adherence over time; message or flag a patient for urgent follow-up.

### Patient

1. Added by the doctor at discharge — no separate signup required to be in the system.
2. Receives medication reminders at scheduled times.
3. Receives follow-up visit reminders ahead of the date.
4. Responds to periodic check-ins: *did you take your medication*, *how are you feeling*, symptom flags.
5. Reached one of two ways depending on phone:
   - **Smartphone with POST installed** — push notification, in-app check-in.
   - **Any phone, no app** — SMS reminder, SMS reply check-in (Africa's Talking).

## 4. Data model

**Doctor** — id, name, specialty, phone, hospital/clinic name (free text in v1), auth credentials

**Patient** — id, name, phone, doctor_id, diagnosis, treatment_summary, discharge_date, has_app, preferred_channel (app | sms)

**CarePlan** — id, patient_id, created_by
- `medications[]` — name, dosage, frequency, times[], start_date, end_date
- `follow_up_visits[]` — date, location, notes
- `red_flag_symptoms[]`

**MedicationLog** — id, patient_id, medication_id, scheduled_time, taken (bool | null), logged_at, source (app | sms | missed-no-response)

**CheckIn** — id, patient_id, sent_at, responded_at, response_type (adherence | symptom | wellbeing), response_payload, flagged

**Alert** — id, patient_id, doctor_id, type (missed_meds | red_flag_symptom | missed_visit), created_at, resolved

## 5. Notification system

The core of POST's value: reminders must be reliable without a smartphone.

- **Medication reminders** — scheduled per care plan ("8:00 AM — take Amoxicillin"), delivered by push or SMS.
- **Visit reminders** — configurable lead times before a follow-up date (e.g. 3 days, 1 day).
- **Response capture** — app check-ins are structured (buttons, quick reply); SMS check-ins use numeric reply codes ("Reply 1 = took it, 2 = not yet, 3 = need help").
- **Missed-response escalation** — no response after N reminders generates an Alert for the doctor. A miss is never silently logged.
- **Delivery** — Africa's Talking for SMS, Firebase Cloud Messaging for push.

## 6. Tech stack (proposed)

- **Mobile app** (doctor + smartphone patients) — Flutter, single codebase, matches existing stack
- **Backend** — REST API; language aligned with existing stack, or Firebase if speed-to-MVP outweighs long-term flexibility
- **Database** — Postgres (or Firestore on the Firebase route); care plans and logs need real modelling, not key-value
- **SMS** — Africa's Talking
- **Push** — Firebase Cloud Messaging
- **Offline** — local queue on the patient app for check-in responses, synced when connectivity returns

See `docs/DECISIONS.md` for the recommendation on the open stack questions.

## 7. MVP scope

**In**
- Doctor auth + manual patient entry
- Care plan builder (meds, follow-up visits, red flags)
- Medication and visit reminders (SMS + push)
- Patient check-in (SMS reply codes, in-app quick response)
- Doctor triage dashboard + alerts
- Patient detail view with adherence history

**Deferred (v2+)**
- Hospital ERP integration (per-hospital adapters)
- Multi-doctor / clinic accounts with shared patient pools
- Analytics and reporting for hospital administrators
- In-app doctor↔patient messaging
- Languages beyond Swahili and English

## 8. Non-functional requirements

- **Privacy and security** — patient health data encrypted at rest and in transit; role-based access so a doctor sees only their own patients; no third-party data sharing.
- **Offline-first on the patient side** — logging a dose or a symptom works without connectivity and syncs later.
- **Low bandwidth** — the app functions on the poor connections common outside major cities.
- **Reminder reliability** — the product's core promise. Delivery failures are logged and retried, never silently dropped.

## 9. Design direction

- Calm and light by default. A recovering patient opening this app is often anxious, and a doctor scanning triage needs urgency to be unmissable — so colour carries the calm (soft surfaces, a healing teal, muted tints) and structure carries the urgency (sort position, rail, icon, written label). Dark mode is a deliberate re-pick of every token, not an inversion.
- Calm never means vague: a missed dose is shown plainly as missed, with softened colour and unsoftened words, and every warning state carries its next action.
- Brand continuity with the existing dark-and-gold product line is kept to the wordmark. It is not worth an anxious interface.
- Swahili-first UI with an English toggle.
- The doctor dashboard prioritises scannability: triage at a glance, not a dense table.

Foundations, tokens, and the urgency hierarchy are specified in `docs/DESIGN-SYSTEM.md`.

## 10. Open decisions

Tracked with recommendations in `docs/DECISIONS.md`.
