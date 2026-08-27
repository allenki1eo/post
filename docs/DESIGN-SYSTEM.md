# POST Design System — Foundations

Tokens are the contract. Components reference token names; nothing in a component references a raw hex, px, or ms. Built against `.claude/skills/ui-craft`, audited with `.claude/skills/design-system-checklist`, and the status palette validated with the `dataviz` skill's checker.

**Light is the default.** Dark mode exists and is a deliberate re-pick of every token against a dark surface, not an inversion.

## The two tensions to resolve first

### 1. Calm versus urgent

A recovering patient opening this app is often anxious. A doctor scanning triage needs urgency to be unmissable. Solve both by giving them different channels:

- **Colour carries calm.** Soft surfaces, a healing teal, muted tints instead of saturated fills. Nothing on a routine screen shouts.
- **Structure carries urgency.** Urgent patients sort to the top, get a 3px rail, a tinted card, an icon, and a written label. A doctor gets the meaning from position and text before hue.

Because urgency does not depend on saturation, the palette can stay quiet without costing safety. Red is *reserved*: a red element anywhere in POST means a patient needs attention. It appears nowhere decorative.

### 2. Anxiety versus honesty

Calm must not mean vague. A missed dose is shown plainly as missed — softened colour, unsoftened words. Patients are not reassured by an interface that hides bad news; they are reassured by one that is clear about what to do next. Every warning state carries its next action.

## Colour

Warm-free, low-chroma neutrals; a single calm primary; status colours reserved. Every pairing below is measured, not estimated — the light set passes AA for text and 3:1 for UI boundaries, and the four status hues clear the CVD separation check.

### Light (default)

| Token | Value | Use |
| --- | --- | --- |
| `--bg` | `oklch(0.98 0.004 240)` | Page background — paper, not pure white |
| `--surface` | `oklch(1 0 0)` | Cards, list rows, sheets |
| `--surface-sunken` | `oklch(0.965 0.006 240)` | Wells, secondary panels, code |
| `--border` | `oklch(0.91 0.008 240)` | Hairlines and dividers |
| `--border-strong` | `oklch(0.78 0.012 240)` | Emphasis dividers |
| `--border-control` | `oklch(0.62 0.014 240)` | Input and control borders (3:1) |
| `--text` | `oklch(0.30 0.02 250)` | Primary text — 13:1 |
| `--text-secondary` | `oklch(0.45 0.02 250)` | Supporting copy — 7.4:1 |
| `--text-muted` | `oklch(0.52 0.018 250)` | Metadata — 5.5:1, the floor |

### Dark (a re-pick, not a flip)

| Token | Value |
| --- | --- |
| `--bg` | `oklch(0.205 0.012 250)` |
| `--surface` | `oklch(0.245 0.012 250)` |
| `--surface-sunken` | `oklch(0.185 0.012 250)` |
| `--border` | `oklch(0.32 0.014 250)` |
| `--border-control` | `oklch(0.60 0.016 250)` |
| `--text` | `oklch(0.95 0.006 250)` |
| `--text-secondary` | `oklch(0.80 0.01 250)` |
| `--text-muted` | `oklch(0.68 0.012 250)` |

Elevation in dark comes from surface lightness; in light it comes from a soft shadow over a near-white ground. Neither uses a border to fake depth.

### Primary — healing teal

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--primary` | `oklch(0.50 0.075 190)` | `oklch(0.72 0.085 185)` | Primary action fill, active nav |
| `--primary-hover` | `oklch(0.44 0.075 190)` | `oklch(0.78 0.085 185)` | Hover on a primary fill |
| `--primary-text` | `oklch(0.45 0.08 190)` | `oklch(0.80 0.075 185)` | Links, quiet emphasis |
| `--primary-soft` | `oklch(0.95 0.02 190)` | `oklch(0.30 0.035 190)` | Selected rows, soft badges |
| `--on-primary` | `oklch(1 0 0)` | `oklch(0.18 0.02 250)` | Text on a primary fill |

Teal, not blue: blue is the default of every enterprise dashboard, and a desaturated blue-green reads as clinical care without reading as software. Not green alone either — green is spoken for by "dose taken".

`--brass` `oklch(0.62 0.07 75)` is the one carry-over from the previous dark-and-gold direction, and it appears in exactly one place: the wordmark. Brand continuity is worth a wordmark; it is not worth an anxious interface.

### Status — reserved, never decorative

| Token | Light | Meaning | Icon | sw / en |
| --- | --- | --- | --- | --- |
| `--critical` | `oklch(0.50 0.165 18)` | Red-flag symptom | alert-triangle | Dalili ya hatari / Red flag |
| `--warning` | `oklch(0.65 0.145 72)` | Missed meds, missed visit | clock-alert | Dawa haikunywewa / Missed meds |
| `--success` | `oklch(0.53 0.115 158)` | Dose taken, check-in answered | check | Imekamilika / Done |
| `--info` | `oklch(0.52 0.115 250)` | Upcoming visit, scheduled | calendar | Ijayo / Upcoming |

Each has a `-text` step for type on a surface and a `-soft` step for tinted card backgrounds — the tint is what keeps an urgent card calm while still separating it from the rest of the list.

Measured: worst adjacent pair under normal vision ΔE 22.9, worst under protanopia ΔE 11.1 — both clear of the floor. And still never colour alone: every status ships with an icon and a written label.

## Typography

**Swahili-first.** Swahili strings run 15–25% longer than their English equivalents ("Follow-up visit" → "Ziara ya ufuatiliaji"). Every container flexes; nothing is sized to the English string; buttons wrap rather than truncate. Test in Swahili before English.

- **Family** — Inter, or the platform UI face. One family; a mono face only for dose counts, phone numbers, and SMS previews.
- **Numerals** — `tabular-nums` for anything that updates in place and any column of numbers.
- **Wrapping** — `text-wrap: balance` on headings, `pretty` on body.
- **Measure** — 60–75 characters for treatment summaries and notes.
- **Casing** — sentence case in both languages.
- **Rendering** — `-webkit-font-smoothing: antialiased` on the root.

| Token | Size / line-height | Use |
| --- | --- | --- |
| `--text-display` | 30 / 1.15 | Screen title |
| `--text-title` | 20 / 1.25 | Section header, patient name on detail |
| `--text-body-lg` | 17 / 1.45 | Patient name in triage |
| `--text-body` | 15 / 1.55 | Default |
| `--text-caption` | 13 / 1.45 | Metadata |
| `--text-label` | 12 / 1.35 | Pills and badges — the floor |

## Layout

- **Base unit 4.** Spacing values are multiples: 4, 8, 12, 16, 24, 32, 48.
- **Breakpoints** — `sm` 360 (a cheap Android in portrait), `md` 600, `lg` 905.
- **Touch targets** — 44×44 minimum; 40×40 floor only in dense desktop UI, extended with padding or a pseudo-element rather than an inflated box.
- **Concentric radii** — `outer = inner + padding`. `--radius-sm` 10, `--radius-md` 14, `--radius-lg` 18, `--radius-full` for pills. Rounder than a typical dashboard: soft geometry is part of the calm.
- `h-dvh`, safe-area insets on anything fixed, full-width buttons inside the page margin.

## Elevation

| Token | Light | Use |
| --- | --- | --- |
| `--elev-1` | `0 1px 2px rgb(16 24 40 / 0.04)` + 1px border | Cards |
| `--elev-2` | `0 4px 16px rgb(16 24 40 / 0.08)` | Sheets, dialogs, popovers |
| `--elev-3` | `0 12px 32px rgb(16 24 40 / 0.12)` | Toasts |

Shadows are cool-tinted and shallow. In dark mode each step is a lighter surface instead.

Z-index scale, fixed: `--z-sticky` 10, `--z-overlay` 100, `--z-modal` 200, `--z-toast` 300.

## Motion

Doctors open triage dozens of times a day; patients open the app while unwell. Both want an interface that is simply *there*.

| Token | Value | Use |
| --- | --- | --- |
| `--dur-fast` | 120ms | Press feedback, toggles |
| `--dur-base` | 180ms | Sheets, dialogs, popovers |
| `--dur-slow` | 240ms | Ceiling |
| `--ease-out` | `cubic-bezier(0.2, 0, 0, 1)` | Enter and exit |

- **No animation** on triage rendering, filter switches, tab changes, or anything keyboard-driven.
- Alerts never animate in. Motion would delay the read and make urgency feel decorative.
- Press feedback `scale(0.96)`; compositor properties only; never `transition: all`.
- Honour `prefers-reduced-motion` — drop movement, keep the state change.

## Iconography

- 24px grid, 20px dense. One set. Stroke 1.5px beside regular text, 2px beside semibold.
- Outline default, filled for active. One `currentColor` SVG per icon; states from CSS.
- `aria-label` on every icon-only control, in the active language.
- **Reserved icons**, never reassigned: triangle = critical, clock-alert = missed, check = adherent, calendar = visit, pill = medication, message = check-in.

## Data display

The only visualisation in v1 is the **dose strip**: the last 14 scheduled doses as a row of small marks, newest last.

- Colour by status, plus a shape so the strip survives colour blindness and a photocopy: filled circle = taken, filled square = missed, hollow circle = waiting.
- 2px gap between marks so adjacent states never blur into a bar.
- Direct-labelled with a legend; the adherence percentage is stated as a number beside it, since the number is what gets said out loud in a consultation.
- No axis, no gridlines, no tooltip on the doctor's list view — the strip is a glance, and the detail view carries the exact times.

Adherence percentage is a **stat**, not a chart: one number, `tabular-nums`, with its window named ("siku 7 zilizopita" / "last 7 days"). A percentage with no window is a number nobody can act on.

## SMS as a design surface

Most POST patients will never see a screen. The SMS *is* the interface, with harder constraints than any of them.

- **160 characters** per GSM-7 segment. Swahili copy must fit one; two segments cost double and can arrive out of order.
- **GSM-7 only.** One emoji or curly quote flips the message to UCS-2 and drops the limit to 70.
- **Every reminder restates its reply grammar.** There is no scrollback.
- **Identify the sender in every message** so an unexpected SMS is not read as a scam.
- **No diagnosis, ever.** SMS is unencrypted and phones are shared.
- Swahili first, English as the toggle — including the reply keywords.

## Component definition of done

Applies to every POST component: TriageCard, PatientRow, CarePlanBuilder, MedicationScheduleRow, DoseStrip, CheckInResponse, AlertBanner, SMS template.

- **States** — default, hover, focus-visible, active, disabled, loading, error, empty, selected.
- **Structure** — documented anatomy, a variant API in the design vocabulary, composition examples.
- **Accessibility** — native element or correct role, keyboard support, focus management, wired labels, announced state changes.
- **Responsiveness** — 360 to 905, ≥44px targets, no horizontal scroll.
- **Content** — long Swahili string, missing value, empty list, error text, an overflowing name.
- **Docs** — when to use, when not to, nearest alternative.

An empty triage dashboard is a **good** outcome, not an error: "Hakuna anayehitaji msaada sasa" / "No one needs attention right now" — with one clear action, *add a patient*.
