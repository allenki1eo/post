# POST Design System — Foundations

Tokens are the contract. Components reference token names; nothing in a component references a raw hex, px, or ms. Built against `.claude/skills/ui-craft` and audited with `.claude/skills/design-system-checklist`.

## The tension to resolve first

Dark and gold reads as luxury. Medical triage needs urgency to read as urgency. These fight if gold is allowed to signal importance, because then every screen is warm and nothing stands out.

**Resolution: gold is brand and primary action only. It never signals state.** Urgency is carried by a separate red/orange semantic set, and — per the never-color-alone rule — always by three things at once:

1. **Position** — urgent patients sort to the top of triage. Sorting does more work than color.
2. **A left rail** on the card, 3px, in the urgency color.
3. **A label and icon** — "Dawa haikunywewa" / "Missed meds" with its icon. A doctor scanning in sunlight on a cheap screen gets the meaning from the text, not the hue.

Glow, gradients, and pulsing are not urgency signals. They are noise that makes a clinical tool look like a crypto dashboard.

## Color

Dark-first. Warm neutrals (hue 80) so gold sits naturally rather than looking pasted on.

### Neutral scale

| Token | Value | Use |
| --- | --- | --- |
| `--bg` | `oklch(0.16 0.006 80)` | Page background |
| `--surface` | `oklch(0.20 0.006 80)` | Cards, list rows |
| `--surface-raised` | `oklch(0.24 0.006 80)` | Sheets, dialogs, popovers |
| `--surface-hover` | `oklch(0.26 0.006 80)` | Hover/pressed on a surface |
| `--border` | `oklch(0.32 0.006 80)` | Structural borders, dividers |
| `--border-strong` | `oklch(0.42 0.006 80)` | Input borders, selected state |
| `--text` | `oklch(0.97 0.004 80)` | Primary text |
| `--text-secondary` | `oklch(0.80 0.005 80)` | Supporting copy |
| `--text-muted` | `oklch(0.68 0.005 80)` | Metadata, timestamps — the AA floor, do not go lower |

Elevation in dark UI comes from surface lightness, not shadow. Each step up the surface scale is one step lighter; shadow is support only.

### Brand

| Token | Value | Use |
| --- | --- | --- |
| `--gold` | `oklch(0.80 0.12 88)` | Primary action fill, active nav, brand marks |
| `--gold-hover` | `oklch(0.86 0.12 88)` | Hover on gold fill |
| `--gold-dim` | `oklch(0.58 0.09 88)` | Gold borders and rules on dark |
| `--on-gold` | `oklch(0.18 0.01 80)` | Text and icons on a gold fill |

`--on-gold` on `--gold` is a dark-on-light pairing and clears AA comfortably. Never place `--text` (near-white) on gold.

### Semantic / urgency

| Token | Value | Meaning | Icon | sw / en label |
| --- | --- | --- | --- | --- |
| `--critical` | `oklch(0.60 0.20 25)` | Red-flag symptom reported | alert-triangle | Dalili ya hatari / Red flag |
| `--critical-text` | `oklch(0.76 0.15 25)` | Critical text on dark | | |
| `--warning` | `oklch(0.72 0.16 45)` | Missed medication, missed visit | clock-alert | Dawa haikunywewa / Missed meds |
| `--warning-text` | `oklch(0.82 0.12 45)` | Warning text on dark | | |
| `--success` | `oklch(0.68 0.15 150)` | Dose taken, check-in answered | check | Imekamilika / Done |
| `--info` | `oklch(0.70 0.12 240)` | Upcoming visit, scheduled | calendar | Ijayo / Upcoming |

Warning sits at hue 45 and gold at hue 88 — far enough apart to read as different colors on a cheap panel. That separation is the reason gold cannot also mean "attention".

Red on a dark surface is not enough on its own for red-green color blindness: critical is `--critical` **plus** the triangle icon **plus** top position in the list.

### Rules

- One accent per screen. If a screen has a gold primary button, nothing else on it is gold.
- Headings are `--text`. Gold is for links and actions.
- Never use `--critical` decoratively. A red element on a POST screen means a patient needs attention.
- Light mode is out of scope for v1. When it arrives it is a token swap on `:root`, not a filter.

## Typography

**Swahili-first.** Swahili strings run roughly 15–25% longer than their English equivalents ("Follow-up visit" → "Ziara ya ufuatiliaji"). Every container flexes; nothing is sized to fit the English string. Buttons wrap to two lines rather than truncate. Test every screen in Swahili before English.

- **Family** — Inter (or the system UI face on Android), full Latin coverage, legible at small sizes on low-density screens. One family; a mono face only for dose counts and IDs.
- **Numerals** — `tabular-nums` everywhere a number changes in place: adherence percentages, dose counts, days-since-discharge, countdowns.
- **Wrapping** — `text-wrap: balance` on headings, `text-pretty` on body.
- **Measure** — 60–75 characters for treatment summaries and notes.
- **Casing** — sentence case throughout, in both languages. No all-caps labels; Swahili all-caps is harder to scan.
- **Rendering** — `-webkit-font-smoothing: antialiased` on the root.

| Token | Size / line-height | Use |
| --- | --- | --- |
| `--text-display` | 28 / 1.1 | Screen title |
| `--text-title` | 20 / 1.2 | Section header, patient name on detail |
| `--text-body-lg` | 17 / 1.5 | Patient name in triage, primary reading |
| `--text-body` | 15 / 1.55 | Default |
| `--text-caption` | 13 / 1.4 | Metadata, timestamps |
| `--text-label` | 12 / 1.3 | Pills and badges — the floor, nothing smaller ships |

Hierarchy comes from weight, color, and spacing before another size step.

## Layout

- **Base unit 4.** Every spacing value is a multiple: 4, 8, 12, 16, 24, 32, 48.
- **Breakpoints** — `sm` 360 (the floor: a cheap Android in portrait), `md` 600 (large phone / small tablet), `lg` 905 (tablet, doctor rounds).
- **Touch targets** — 44×44 minimum, extended with a pseudo-element or padding rather than an inflated visual box. Doctors tap these one-handed while holding a chart.
- **Concentric radii** — `outer = inner + padding`. `--radius-sm` 8, `--radius-md` 12, `--radius-lg` 16, `--radius-full` for pills.
- `h-dvh`, safe-area insets on anything fixed.
- Full-width buttons stop at the page margin.

## Elevation

| Token | Use |
| --- | --- |
| `--elev-0` | Page background |
| `--elev-1` | Card on page — `--surface`, no shadow, 1px `--border` |
| `--elev-2` | Sheet, dialog — `--surface-raised` + soft shadow |
| `--elev-3` | Toast, snackbar |

Z-index scale, fixed, no arbitrary values: `--z-base` 0, `--z-sticky` 10, `--z-overlay` 100, `--z-modal` 200, `--z-toast` 300.

## Motion

Doctors open the triage dashboard dozens of times a day. Frequency decides motion, and most POST interactions are high frequency.

| Token | Value | Use |
| --- | --- | --- |
| `--dur-fast` | 120ms | Press feedback, toggles |
| `--dur-base` | 180ms | Sheets, dialogs, popovers |
| `--dur-slow` | 240ms | Ceiling. Nothing in POST animates longer. |
| `--ease-out` | `cubic-bezier(0.2, 0, 0, 1)` | Enter and exit, both |

- **No animation** on triage list rendering, filter switches, tab changes, or anything keyboard-driven. The dashboard appears; it does not arrive.
- Alerts never animate in. A new critical alert changes position and color — motion would delay the read and, worse, would make urgency feel decorative.
- Press feedback: `scale(0.96)`.
- Compositor properties only (`transform`, `opacity`). Never `transition: all`.
- Honour `prefers-reduced-motion` — drop the movement, keep the state change.

## Iconography

- 24px grid, 20px in dense rows. One set throughout.
- Stroke 1.5px beside regular text, 2px beside semibold.
- Outline by default; filled marks the active state. One `currentColor` SVG per icon; states come from CSS.
- `aria-label` on every icon-only control, in the active language.
- **Reserved icons** — never reassigned to another meaning: triangle = critical, clock-alert = missed, check = adherent, calendar = scheduled visit, pill = medication, message = check-in.

## SMS as a design surface

Most POST patients will never see the app. The SMS *is* the interface, and it has harder constraints than any screen.

- **160 characters** per GSM-7 segment. Swahili copy must fit one segment — a two-segment reminder costs double and can arrive out of order.
- **GSM-7 only.** No emoji, no curly quotes, no accented characters outside the GSM alphabet — any one of them flips the message to UCS-2 and drops the limit to 70 characters.
- **Every reminder restates its reply grammar.** The patient does not have scrollback and does not remember what "2" meant.
- **Identify the sender in every message.** "POST — Dkt. Mwangi" so an unexpected SMS is not read as a scam.
- **No medical detail beyond what the patient already knows.** SMS is unencrypted and phones are shared; a diagnosis does not go over SMS.
- Copy in Swahili first, English as the toggle — including the reply keywords.

## Component definition of done

Applies to every POST component: TriageCard, PatientRow, CarePlanBuilder, MedicationScheduleRow, CheckInResponse, AlertBanner, AdherenceHistory, SMS template.

- **States** — default, hover, focus-visible, active, disabled, loading, error, empty, selected.
- **Structure** — documented anatomy, a variant API in the design vocabulary, composition examples.
- **Accessibility** — native element or correct role, keyboard support, focus management, wired labels, announced state changes.
- **Responsiveness** — 360 to 905, ≥44px targets, no horizontal scroll.
- **Content** — long Swahili string, missing value, empty list, error text, a name that overflows.
- **Docs** — when to use, when not to, nearest alternative.

An empty triage dashboard is a **good** outcome, not an error state: "Hakuna anayehitaji msaada sasa" / "No one needs attention right now" — with one clear action, *add a patient*.
