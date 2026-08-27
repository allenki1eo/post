# POST

Post-treatment patient care continuity. After a doctor treats or discharges a patient, POST keeps the care going: the patient gets medication and follow-up reminders (app push or SMS, so a smartphone is not required), and the doctor gets a dashboard triaged by who needs attention.

Built for Tanzania, where transport cost and distance make return visits rare and follow-up inconsistent.

## Running it

The API and reminder engine live in [`server/`](server/) — Node + Express +
Postgres, with the job queue in Postgres itself.

```bash
cd server && npm install && npm run migrate
npm run demo                 # seeds a doctor, 5 patients, 2 days of history
POST_DEMO=1 npm run dev      # http://localhost:3000
```

`npm test` runs 40 tests against a real Postgres, including the whole slice:
discharge → care plan → SMS reminder → patient reply → missed dose → alert on
the triage dashboard.

## Docs

| Doc | What's in it |
| --- | --- |
| [docs/PRODUCT.md](docs/PRODUCT.md) | Problem, product model, user flows, data model, notification system, MVP scope |
| [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md) | Tokens — color, type, layout, motion, icons — plus SMS as a design surface |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Recommendations on the open questions, and the ones the reminder engine forces |
| [server/README.md](server/README.md) | Architecture, what is deliberate, what is not built yet |

## UI skills

Distilled UI craft rules, packaged as Claude Code skills so any session in this repo picks them up automatically.

```
.claude/skills/
├── ui-craft/                  Building and reviewing interfaces
│   ├── SKILL.md               Core rules — restraint, type, layout, interaction, motion, icons
│   └── references/
│       ├── motion.md          Duration, easing, origin, interruptibility, staging, reduced motion
│       ├── typography.md      Wrapping, numerals, measure, hierarchy, rendering
│       ├── layout-surfaces.md Radii, elevation, spacing, hit areas, scroll affordances, images
│       ├── color-a11y.md      Palette structure, contrast, focus, dark mode, non-color signals
│       ├── stack.md           Primitives and component libraries, and how to combine them
│       └── review.md          Audit workflow, severity model, review output format
└── design-system-checklist/   Planning and auditing a design system
    ├── SKILL.md               Foundations, component definition of done, audit workflow
    └── CHECKLIST.md           Full inventory: foundations, language, ~30 components, maintenance
```

## Using it

**In Claude Code** — skills in `.claude/skills/` load automatically for sessions in this repo. Invoke one explicitly with `/ui-craft` or `/design-system-checklist`, or just describe the work ("this dropdown feels off", "audit our tokens") and the description frontmatter routes it.

**Elsewhere** — the files are plain Markdown. Paste `ui-craft/SKILL.md` into any agent as a system rule, or read it yourself.

## The two rules behind the rest

**Frequency decides motion.** An animation on something a user triggers 300 times a day costs them 300 waits. High-frequency and keyboard-driven interactions get no animation; rare moments can afford delight.

**Restraint reads as quality.** One accent per view, neutral headings, spacing before dividers, shadows for depth and borders for structure. Most of what makes UI look AI-generated is additive — gradients, glow, four accent colors, motion on everything.

## Sources

Every rule here traces to a source listed in [SOURCES.md](SOURCES.md), with what was taken from each.
