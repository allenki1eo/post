# POST Design System

Concept: **clinical field notebook, refined for mobile**. Information is
organized like a clear follow-up record; typography and spacing create
hierarchy before containers do; status is factual and quiet; AI is invisible
infrastructure, never the visual brand.

Implementation: `src/theme/tokens.ts` and `src/components/primitives/`.

## Tokens

### Color

| Token | Value | Use |
|---|---:|---|
| `canvas` | `#F5F7F5` | Main background |
| `surface` | `#FFFFFF` | Raised or grouped content |
| `ink` | `#17231F` | Primary text |
| `mutedInk` | `#5C6964` | Secondary text |
| `brand` | `#0B6B61` | Primary actions, active navigation |
| `brandStrong` | `#075249` | Pressed/high-contrast brand state |
| `line` | `#DCE3DF` | Dividers, quiet boundaries |
| `review` | `#9A5B06` | Review workflow status (with `reviewSurface` `#FBF3E7`) |
| `urgent` | `#B42318` | Urgent workflow status only (with `urgentSurface` `#FCEBEA`) |
| `success` | `#247A52` | Confirmed completion, sync success (with `successSurface` `#EAF4EF`) |
| `focus` | `#1769E0` | Accessible focus indication |

Rules:

- Status color is **always** paired with text and, when useful, a glyph
  (`StatusLabel`). Never color alone.
- `urgent` is reserved for the urgent workflow status; it is not a generic
  error red.
- Refine values only through an explicit design review recorded in
  `docs/DESIGN_QA.md`.

### Typography

Native system font (excellent rendering, fast load, full Kiswahili support).

| Variant | Size/Line | Weight | Use |
|---|---|---|---|
| `title` | 24/30 | 600 | Screen titles |
| `heading` | 18/24 | 600 | Section headings |
| `body` | 16/22 | 400 | Body text, controls |
| `secondary` | 14/20 | 400 | Supporting text |
| `label` | 12/16 | 500 | Status labels, metadata |

- Tabular numerals for medication counts (`fontVariant: ['tabular-nums']`).
- OS font scaling is always honored (`allowFontScaling`).
- Every component must tolerate ≥35% text expansion (Kiswahili runs long);
  two-line labels are permitted, shrinking important text is not.

### Spacing, radius, touch

- Four-point grid: 4 / 8 / 12 / 16 / 24 / 32 (`spacing.xs…xxl`).
- Radius: 6 / 10 / 14. Cards are the exception for meaningful grouping, not
  the default wrapper — most lists use quiet hairline dividers (`ListRow`).
- Minimum touch target 44×44pt (`MIN_TOUCH_TARGET`).

## Components (current set)

| Component | States covered | Notes |
|---|---|---|
| `AppText` | default, muted, colored | All text goes through this |
| `Button` | default, pressed, disabled | Immediate pressed feedback, no animation |
| `Screen` | padded/scroll variants | Canvas bg, safe-area, optional demo banner |
| `DemoBanner` | — | `DEMO - SYNTHETIC DATA`; mandatory on clinician surfaces |
| `StatusLabel` | on_track / review / urgent | Color + glyph + localized text |
| `ListRow` | default, pressed, with trailing | Information-dense clinician rows |
| `SectionHeading` | — | Hierarchy from type + spacing |
| `EmptyState` | — | Plain factual copy, no illustration filler |
| `ErrorBoundary` | error | Recovery without exposing patient data |

To add in later milestones (per the specification's component discipline
list): field, radio/checkbox, segmented control, banner variants, provenance
label, verification label, share-scope selector, grant card, access-event
row, agent-step row, approval panel, sheet, dialog, toast, skeleton,
timeline, offline-state components.

## Content rules

- English and Kiswahili are equal. Semantic keys only; full sentences with
  named interpolation; no fragment concatenation (`src/i18n/`).
- Medication names are never translated or rephrased; clinician-entered
  wording renders verbatim.
- Workflow statuses are labeled as priorities, with the explanatory note
  "Workflow priority, not a diagnosis" available wherever status is central.
- AI-organized content always carries the `AI-assisted organization…` label.
- Adherence always shows numerator and denominator ("8 confirmed / 10
  expected"), never only a percentage.

## Density rules

- Patient screens: one unmistakable primary action, generous spacing, plain
  language, progress stated in sentences.
- Clinician screens: information-dense list rows with priority, reason,
  time, and next action visible without opening menus.

## Motion contract

Every animation needs a written purpose (spatial continuity, direct
manipulation feedback, state change, rare delight). Current build: **no
decorative animation**. Pressed feedback is immediate style change. Reduced
motion is respected by default because nothing animates. When motion is
added, keep ordinary transitions 120–220 ms, below 300 ms, never blocking
input, and test on a modest Android device.

## Anti-slop checklist (enforced at design QA)

No gradients, glassmorphism, glowing borders, sparkle/robot AI branding,
nested cards, pill-everything, decorative charts, fake metrics, stock
medical imagery, centered body copy on operational screens, or spinners
where a stable layout is clearer. See specification §17 for the full list;
violations require a documented product reason in `docs/DESIGN_QA.md`.
