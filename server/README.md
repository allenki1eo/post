# POST server

The API and reminder engine: doctors log patients and care plans, the engine
turns those plans into reminders, and patient replies come back as adherence,
alerts, or a message the doctor needs to read.

Node + Express + Postgres, per [`docs/DECISIONS.md`](../docs/DECISIONS.md) D1.
The job queue is Postgres itself — `for update skip locked` over a due-message
index — so the whole system is one database you can inspect with SQL.

## Run it

```bash
createdb post
cp .env.example .env            # DATABASE_URL, SMS_GATEWAY=fake to start
npm install
npm run migrate

npm run demo                    # seeds a doctor, 5 patients, 2 days of history
POST_DEMO=1 npm run dev         # http://localhost:3000
```

`npm run demo` prints the demo sign-in. The dashboard is a browser stand-in for
the Flutter app: triage, patient detail, the SMS outbox, and controls to reply
as a patient or run a reminder tick by hand. It is mounted only when
`POST_DEMO=1`.

## Test

```bash
npm test                        # 40 tests against a real Postgres
TEST_DATABASE_URL=postgres://... npm test
```

Tests run against real Postgres rather than a mock, because the parts most
worth testing — `skip locked` claiming, partial unique indexes on open alerts,
timestamptz arithmetic across a timezone — are exactly the parts a mock would
paper over.

## How it fits together

```
care plan  ──expand──▶  medication_logs + messages(queued)
                              │
                     worker tick (claim → send → confirm)
                              │
                      SMS  ──▶ patient  ──reply──▶  webhook
                              │                        │
                    delivery report              parse (1/2/3, keywords, free text)
                              │                        │
                              └──────▶ alerts ◀────────┘
                                          │
                                    triage dashboard
```

| File | What lives there |
| --- | --- |
| `migrations/001_init.sql` | Schema, including the alert-is-a-state unique index and the audit trail |
| `src/domain/scheduling.ts` | Care plan → dose logs and queued messages, idempotent over a rolling horizon |
| `src/domain/time.ts` | Local wall clock ↔ UTC, quiet hours, retry backoff |
| `src/domain/sms-templates.ts` | GSM-7 safe Swahili/English copy that fits one segment |
| `src/domain/sms-grammar.ts` | Reply parsing: numeric codes, keywords, and free text that is never dropped |
| `src/domain/escalation.ts` | Missed doses, thresholds, alerts, plan lifecycle |
| `src/domain/inbound.ts` | Inbound SMS and delivery reports |
| `src/worker.ts` | The tick: expand → send → sweep → escalate |
| `src/api/` | Auth, patients, care plans, triage, webhooks |

## Things that are deliberate

**A dose is only "missed" if we reached the patient.** If the SMS never landed,
that is an `unreachable` alert, not an adherence failure. Blaming a patient's
adherence for our delivery problem would be a lie in their chart.

**Alerts are state, not an event log.** One open alert per patient per type,
enforced by a partial unique index. Five missed doses is one conversation.

**Free text is never rejected.** A patient texting "nina maumivu ya kifua"
gets their words in front of their doctor, not an "invalid reply" bounce.

**Quiet hours move a reminder earlier, never later.** A 22:00 dose sends at
21:00 naming the dose time, because a reminder after the dose is useless and a
2am SMS costs you the patient.

**Every timestamp is UTC; every promise is local.** `08:00` means 08:00 where
the patient lives, stored with their timezone, so a server move cannot shift
anyone's medication schedule.

## Not built yet

- Push notifications (FCM). The schema and channel selection are in place;
  v1 delivers over SMS because a push that silently fails is worse than an SMS.
- Doctor→patient messaging, hospital ERP adapters, clinic accounts — v2, per
  [`docs/PRODUCT.md`](../docs/PRODUCT.md) §7.
- The Flutter apps. This server is what they talk to.
