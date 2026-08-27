# Open Decisions

Recommendations for the questions left open in `PRODUCT.md`, plus the ones that surface once you try to build the reminder engine. Each is a proposal, not a settled fact — overrule any of them and the doc gets updated.

## D1 — Backend: Node + Postgres, not Firebase

**Recommendation: Node (NestJS or Express) + Postgres + a real job queue (BullMQ/Redis or pg-boss).**

Firebase is genuinely faster to an MVP, and for most apps that would win. It loses here on the one thing POST is actually selling:

- **Reminder scheduling is the product.** Millions of "send at 08:00 local, retry on failure, escalate after N misses" jobs is a job-queue problem. Cloud Functions + Cloud Scheduler can do it, but you rebuild retry semantics, idempotency, and backoff yourself, in an environment where you cannot easily inspect what is queued.
- **Africa's Talking is webhook-based.** Delivery reports and inbound SMS replies arrive as HTTP callbacks that need parsing, matching to a pending CheckIn, and idempotent handling of duplicates. That is a plain HTTP server's job.
- **The queries are relational.** "Adherence over the last 14 days per medication per patient" and "patients with an unresolved alert, sorted by severity" are joins and aggregates. In Firestore they become denormalised counters that drift from the truth.
- **Health data needs an audit trail.** Who saw which patient record, and when. Postgres gives row-level scoping and an append-only audit table; Firestore rules can enforce access but leave a weaker record of it.

If speed to a demo is the overriding constraint, the honest compromise is Firebase Auth + FCM (both genuinely good) in front of a Node/Postgres API — not Firestore as the system of record.

**Node over PHP** only because the SMS/webhook/queue ecosystem is better served there and it shares a language with tooling. If the team is materially faster in PHP, Laravel + Postgres + Horizon is the same architecture and a fine answer; the database choice matters far more than the language.

## D2 — SMS reply grammar: numeric primary, keyword fallback

**Recommendation: numeric codes as the documented grammar, keywords accepted silently, and nothing ever dropped.**

- Every reminder restates its own grammar. No scrollback, no memory: `Jibu 1 = nimekunywa, 2 = bado, 3 = nahitaji msaada`.
- Accept, case- and whitespace-insensitive: `1` `2` `3`; `NDIYO` `HAPANA` `MSAADA`; `YES` `NO` `HELP`; and a leading-digit match so "1 asante" parses.
- **Unparsed replies are not errors.** Store the raw text, attach it to the open CheckIn, and surface it to the doctor as an unread message. A patient who texts "nina maumivu ya kifua" (chest pain) must never receive "invalid reply".
- Never require a keyword the patient must type in a second language. Swahili keywords are primary; English is the alias.
- One question per SMS. A message asking two things gets one ambiguous digit back.
- `STOP`/`ACHA` unsubscribes immediately, generates an alert for the doctor, and does not silently continue sending.

## D3 — Care plan lifecycle: derived end date + a 7-day tail

**Recommendation: a care plan is active until `max(last medication end_date, last follow_up_visit date) + 7 days`, then it auto-archives.**

- The 7-day tail catches the check-in after the last dose and the patient who missed the final visit.
- At the tail's end the doctor gets one prompt: *close, extend, or convert to a new plan*. Auto-archive is the default if they don't act — an unanswered prompt must not keep sending reminders forever.
- A patient is **active** while any care plan is open, **archived** otherwise. Archived patients stay searchable and their history is intact; they just leave triage.
- Chronic conditions (hypertension, diabetes, ART) have no natural end date. Give the care plan an explicit `open_ended` flag that skips the derived end but requires the doctor to re-confirm every 90 days — otherwise POST accumulates zombie plans that nobody is actually watching.
- Reminders stop the moment a plan archives. A patient receiving pill reminders for a course they finished last month is how you get ignored.

## D4 — Solo practitioners: yes, with the location caught elsewhere

**Recommendation: hospital/clinic is optional free text on the Doctor record; visit location is required on each follow-up visit.**

Requiring an affiliation excludes exactly the practitioners with the least follow-up infrastructure — the ones POST helps most. But "come in on the 14th" with no place is a useless reminder, so location moves to where it is actually needed: `follow_up_visits[].location`, required, and it goes into the SMS.

Free text now, a real facility registry in v2 when there is a reason to aggregate by hospital.

---

## Decisions the spec doesn't raise yet, that the reminder engine forces

**D5 — Timezone.** Store every timestamp in UTC; store the schedule as a local wall-clock time plus a timezone on the Patient (`Africa/Dar_es_Salaam` default). "08:00" is a local promise, not an instant. Tanzania has no DST, so this is cheap now and unbreakable later.

**D6 — Escalation thresholds, configurable per plan with sane defaults.** 2 consecutive missed doses, or 3 in a rolling 7 days → `missed_meds` alert. Any red-flag symptom reply → `red_flag_symptom` alert immediately, no threshold. A follow-up visit date passing with no confirmation → `missed_visit` alert the next morning. Doctors override per patient; a post-op patient and someone on a 5-day antibiotic course do not warrant the same trigger.

**D7 — Quiet hours.** No SMS between 21:00 and 06:00 local. A dose scheduled at 22:00 sends at 21:00 with the time named in the message. Waking a recovering patient loses the relationship.

**D8 — Delivery is a state machine, not a fire-and-forget call.** `queued → sent → delivered → failed`, persisted per message, driven by Africa's Talking delivery reports. Retry a failed send twice with backoff, then raise an alert telling the doctor *the patient could not be reached* — a delivery failure is clinical information, not a logging concern.

**D9 — Consent and phone ownership.** The doctor confirms at entry that the patient consented to SMS follow-up and that the number is the patient's own, not a shared family phone. It is one checkbox, it is the legal and ethical basis for everything that follows, and it determines how much detail the SMS may carry.

**D10 — Phone number as identity.** Numbers get reassigned and patients switch SIMs. Normalise to E.164 on entry, and treat a number change as an explicit doctor action that closes the old channel — never silently re-point a care plan at a new number.
