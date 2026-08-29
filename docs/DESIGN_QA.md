# Design QA Log

## Review 2 — Milestone 2 patient follow-up journey (2026-08-29)

### UI Skills routing flow

Re-ran the routing flow for this milestone's UI work (form and wizard
patterns):

```bash
npx ui-skills categories
npx ui-skills list --category interaction
npx ui-skills list --category accessibility
```

**Selected skill:** none newly loaded — the registry still exposes no React
Native form/wizard skill, and `callstackincubator/react-native-best-practices`
(loaded in Review 1) remains the only RN-targeted entry. Its guidance applied
again in one concrete decision: the check-in keeps all answers in one
component's state instead of remounting per step, so back navigation is a
state change rather than a re-render of a fresh subtree. Web-only references
(COSS UI field structure and state design; "You Don't Need Animations") were
applied manually: labels are real labels rather than placeholders, every
control has an explicit selected/disabled state, and the step progress bar is
a static readout with no animation.

### What was reviewed

The exported web build driven end-to-end with Playwright at 360×740, in both
languages: Today (empty, completed), the full seven-step check-in (doses,
condition, 0–10 scale, yes/no, note, review), the urgent-match result, the
saved-offline result, Progress with real counts, and the patient Profile with
notification preferences. Screenshots in `docs/design-qa-m2/`.

### Findings and decisions

| # | Finding | Decision |
|---|---|---|
| 1 | Check-in route crashed on open (`Cannot read properties of undefined`) | Real bug found by QA, not by tests: the React Compiler hoists a memoized callback's dependency reads to render time, so `data!.carePlan` inside the submit handler ran before the loading guard. Fixed by narrowing `data?.…` into locals first and dropping the non-null assertions |
| 2 | After submitting, Today still offered "Start check-in" and showed 0 confirmed doses | Tab screens stay mounted, so mount-time loads went stale. Added `useFocusRefreshKey` and made Today and Progress reload on focus |
| 3 | Seeded plans sit in the past, so no doses were scheduled "today" | Added a clearly-labeled demo-only `rebaseDemoPlanToToday` in `DemoRepository` so the synthetic patient is always mid-plan. Seed files stay fixed; the evaluation cases still depend on their exact dates |
| 4 | Progress reused "Today" and "Your medicines today" as section headings | Added dedicated `checkInsTitle` / `medicinesTitle` keys in both languages |
| 5 | Expo web export failed: SQLite's WebAssembly worker pulled into the web bundle | Split the store factory by platform extension (`createStore.native.ts` vs `createStore.ts`) so web never resolves the native module |
| 6 | Kiswahili check-in copy runs long ("Thibitisha dozi ulizotumia kweli tu…") | Verified no clipping at 360pt: choice rows wrap to three lines, help text wraps under the label, no fixed heights |
| 7 | Dose rows needed to be unambiguous at a glance | Each row shows medicine, local time, and the clinician's exact wording; confirmation is a checkbox with `accessibilityState.checked`, never color alone |
| 8 | Urgent result must not look like an app-generated verdict | The urgent banner shows the plan's clinic-authored instruction plus each matched rule's clinic-authored message, with `accessibilityRole="alert"`; nothing is paraphrased |
| 9 | Anti-slop pass | No animation anywhere in the wizard, no spinner (the local save is instant), no progress ring or score, no cards nested inside cards |

### Outstanding

- Native device screenshots (iOS/Android) rather than the web export.
- Reduced-motion check once any motion exists (there is none today).
- Larger dynamic-type sweep at the OS maximum font size.


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
