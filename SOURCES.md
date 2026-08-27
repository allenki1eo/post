# Sources

The skills in `.claude/skills/` are written in our own words, but the rules come from these. Where a source states a precise value (200ms, 0.96, 44px, 1.5px stroke), that value is kept as-is — the number *is* the rule.

## [ui-skills.com](https://www.ui-skills.com/) — ibelick

A registry of ~270 UI skills for design engineers, with a CLI (`npx ui-skills`), an MCP endpoint, and a playbook of distilled lessons. Source: [github.com/ibelick/ui-skills](https://github.com/ibelick/ui-skills) (MIT).

Taken from:

- **[Playbook](https://www.ui-skills.com/playbook)** — its 47 distilled lessons, which make up most of the concrete rules in `ui-craft`: aspect-ratio to prevent shift, `text-balance`/`text-pretty`, `tabular-nums`, 44px targets, concentric radii, `scale(0.96)` press feedback, animate popovers from their trigger, spacing before dividers, 16–32px next-item peek, neutral image outlines, `line-clamp`, muted-text contrast, no `scale(0)` entrances, skeletons over spinners, one accent per view, 60–75ch measure, shadows vs. borders, `:focus-visible`, errors beside fields, visible labels, one empty-state action, sentence case, never color alone, `ease-out` entrances, optical icon alignment, icon stroke matching text weight, outline-default icons, no glow, icon cross-fades, 12px control gaps, full-width buttons inside margins, 1.1 heading line-height, display letter-spacing, destructive confirmation, mask-image scroll fades, ~100ms hero stagger, short exits, faster nearby tooltips, interruptible CSS transitions, no repeated animation in routine UI, `ease-out` over springs, menu fade-out, brand color for links and actions, solid modal backdrops, text fade over clipping, matched enter/exit, blur on label change.
- **[baseline-ui](https://www.ui-skills.com/skills/ibelick/baseline-ui)** (ibelick) — the MUST/NEVER constraint list: compositor-only animation, ≤200ms feedback, no `h-screen`, `safe-area-inset`, `cn`, `size-*`, fixed z-scale, no `useEffect` for render logic, no `will-change` outside an active animation, never mix primitive systems, `AlertDialog` for destructive actions, never block paste, no gradients or glow.
- **[improve-animations](https://www.ui-skills.com/skills/emilkowalski/improve-animations)** (Emil Kowalski) — the audit posture in `references/review.md`: recon → audit → vet at `file:line` → report by leverage, the HIGH/MEDIUM/LOW severity model, frequency mapping, and reporting missed opportunities separately.
- **[make-interfaces-feel-better](https://www.ui-skills.com/skills/jakubkrehel/make-interfaces-feel-better)** (Jakub Krehel) — concentric radii, optical alignment, shadows vs. borders, interruptible transitions, stagger and exit rules, icon cross-fade values (scale 0.25→1, opacity 0→1, blur 4px→0, `bounce: 0`), font smoothing, image outline in pure black/white at 0.1 alpha, `scale(0.96)` floor, `initial={false}`, never `transition: all`, hit-area minimums, `currentColor` icon states, and reviewing at 10% speed.
- **[ui-skills-root](https://www.ui-skills.com/skills/ibelick/ui-skills-root)** — the routing idea: load the smallest useful skill context, prefer specific over broad, never more than three at once. Shaped how `ui-craft/SKILL.md` splits into references.
- **[design.md](https://www.ui-skills.com/design.md)** — worked example of a design language doc: neutral scale, reserved darkest values, subtle elevation, restrained radii, sentence case, "no glow, gradients, or decorative color when neutral styling is sufficient".

## [emilkowal.ski/ui/you-dont-need-animations](https://emilkowal.ski/ui/you-dont-need-animations) — Emil Kowalski

The frequency argument that anchors `references/motion.md`: every animation must answer what problem it solves; high-frequency interactions benefit from *no* animation; keyboard-initiated actions should never be animated; UI animation stays under 300ms because a 180ms dropdown feels more responsive than a 400ms one; tooltips delay before the first open but open instantly once one is already open; context matters — a marketing site and a productivity tool have different tolerances.

## [designsystemchecklist.com](https://www.designsystemchecklist.com/)

Open-source checklist for planning, building, and growing a design system. Source: [github.com/ardakaracizmeli/design-system-checklist](https://github.com/ardakaracizmeli/design-system-checklist).

`design-system-checklist/CHECKLIST.md` reproduces its structure — four categories, 42 sections, and the item names — plus the reference links each section carries. The rationale text for each item is **not** copied; read it on the site. `SKILL.md`'s foundations table and component definition of done are our own.

## [coss.com/ui](https://coss.com/ui)

~70 styled components built on Base UI, positioned as "built for developers and AI". Informs `references/stack.md`: Base UI as the default primitive recommendation, and coss ui as the styled layer over it.

## [reui.io/components](https://reui.io/components)

Copy-and-own library in the shadcn ecosystem — Tailwind, with Radix and Base UI variants. Informs `references/stack.md` for the heavier pieces a primitive library doesn't cover: data grid, kanban, event calendar, gantt, filters, file upload, sortable, timeline, stepper.

---

Rules are attributed to the sources above, which remain the canonical reference. Where two sources conflict (e.g. a 200ms vs. 300ms ceiling) the stricter value is used and the looser one kept as the hard limit.
