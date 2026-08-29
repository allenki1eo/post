# Design QA Log

Screenshot-based visual QA record. No screen is "done" after compilation
alone; every milestone ends with a review against `docs/DESIGN_SYSTEM.md`
and the task-relevant references.

## Review 1 — Milestone 0/1 foundation (2026-08-29)

### UI Skills routing flow (required by specification §17)

Ran from the repository root:

```bash
npx ui-skills start        # routing layer loaded
npx ui-skills categories   # 26 categories inspected
npx ui-skills list --category react-native
npx ui-skills list --category systems
npx ui-skills get 'callstackincubator/react-native-best-practices'
```

**Selected skill:** `callstackincubator/react-native-best-practices` — the
only React Native-targeted skill in the registry; the `systems`/`visual`
categories are dominated by Figma- and Tailwind/web-specific skills that do
not apply to an Expo RN app (consistent with the specification's React
Native compatibility rule: COSS UI / ReUI / web component skills are design
references only, never dependencies).

**Concrete decisions it affected:**

- Primitives avoid anonymous inline callbacks that force re-renders where
  cheap to avoid (`Pressable` style functions are the RN-idiomatic
  exception); list rows are plain components ready to move into `FlashList`
  when real list volume arrives in Milestone 2+ (measure first — the guide's
  "Measure → Optimize → Re-measure" cycle).
- No animation library and no decorative motion in the foundation; the
  motion contract already demanded restraint, and the skill's performance
  guidance (Reanimated only for measured needs) confirmed shipping none.
- `jest-expo` unit/component tests run on the JS domain layer; profiling
  tools are deferred until there is a measured problem.

**Manual reference fallback:** the Design System Checklist, COSS UI, ReUI,
and "You Don't Need Animations" guidance was applied manually (foundations
tokens first, field structure, state design, motion restraint) since no
routing skill covers them for RN.

### What was reviewed

Rendered from the exported Expo web build (`npx expo export --platform
web`) with the full synthetic seed data, driven by Playwright at a
360×740 viewport (small-Android width). Screenshots in `docs/design-qa/`:
welcome (en + sw), sign-in (sw), patient Today and Passport (sw), clinician
Home, Reviews, and Templates (en). Native iOS/Android device screenshots
remain outstanding for Milestone 2.

### Findings and decisions

| # | Finding | Decision |
|---|---|---|
| 1 | Template splash color was a generic blue `#208AEF` | Changed to brand `#0B6B61` in `app.json` |
| 2 | Status chips readable but color-only risk | `StatusLabel` always pairs color + glyph + localized text |
| 3 | Kiswahili strings ~20–40% longer (e.g. "Anza kujaza taarifa") | Buttons/rows wrap to two lines; no fixed widths; verified no clipping at 360pt width |
| 4 | Demo banner needed on every clinician surface | `Screen showDemoBanner` prop; banner uses `review` color, quiet, factual |
| 5 | Review queue must show reason + evidence without menus | `ListRow` renders rule description and evidence references inline |
| 6 | Adherence display | Always fraction ("2 / 4"), tabular numerals on clinician summary cards |
| 7 | Template rows | Always carry `FOR DEMONSTRATION - CLINICAL REVIEW REQUIRED` label |
| 8 | Anti-slop pass | No gradients, no sparkle/AI branding, no nested cards, no spinners (instant local data renders directly); cards used only for summary tiles and medication tasks |
| 9 | Screenshot QA caught "Siku ya 12 kati ya 7" (day counter past plan end) | Day clamped to the plan window in `today.tsx` |
| 10 | Production web export correctly hides the dev-only role switch (`__DEV__` false) | Verified while scripting the QA run; demo controls stay development-only |

### Outstanding for Milestone 2

- Real screenshot capture on small Android (360×640) and iPhone viewports in
  both languages, attached to this log (foundation verified on web at those
  widths; device screenshots pending).
- Loading/skeleton states once data becomes genuinely async (SQLite/outbox).
- Offline/sync state components and their accessibility announcements.
