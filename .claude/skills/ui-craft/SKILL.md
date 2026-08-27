---
name: ui-craft
description: Opinionated UI craft rules for building and reviewing interfaces — spacing, hierarchy, typography, color, motion, icons, surfaces, and accessibility. Use when writing or reviewing any frontend UI, when an interface "feels off" or looks AI-generated, when adding animation, or when picking component primitives.
---

# UI Craft

A house rulebook for interface work. It exists to stop two failure modes:

1. **Slop** — generic AI-looking UI: purple gradients, glow, four accent colors, `transition: all`, spinners everywhere, placeholder-as-label.
2. **Fussiness** — motion and decoration added because it was possible, not because it solved anything.

Apply it when building UI, and use it as the bar when reviewing UI.

## How to use this skill

- **Building** — read the Core Rules below, then load the one reference file matching the work (motion, typography, layout, color, stack).
- **Reviewing** — read Core Rules + `references/review.md`, then report violations in the format that file defines.
- **Slow it down** — when judging feel, replay motion at 10% in the browser Animations panel and walk every state: default, hover, focus-visible, active, loading, empty, error. What looks wrong at 10% is subtly wrong at full speed.

**Match the project before matching this file.** Express every fix in the styling system already in the repo (Tailwind in a Tailwind project, plain CSS in a CSS project, the existing CSS-in-JS otherwise), and use existing tokens before inventing values. Never introduce a second styling system to apply a polish fix.

## Core Rules

### Restraint

- One accent color per view. Secondary actions stay neutral.
- Headings neutral; the brand color is for links and actions.
- No gradients, no glow as a primary affordance, no decorative color where neutral works. Never a purple/multicolor gradient.
- Group with spacing first; add a divider only when spacing alone fails.
- Shadows communicate elevation; borders communicate structure and state. Don't use a border to fake depth.

### Type

- `text-wrap: balance` on headings, `text-wrap: pretty` on body copy.
- `tabular-nums` on any number that updates in place, and in tables.
- Body measure 60–75 characters. Heading line-height near 1.1.
- Sentence case for labels and links, never all caps.
- Don't touch letter-spacing except on large display text, which usually wants slightly tighter tracking.
- Truncate with `line-clamp`/`truncate` in dense UI; prefer a mask fade over a hard ellipsis for long labels.

### Layout and surfaces

- Nested radii are concentric: `outer = inner + padding`. Mismatched radii is the most common reason a card "feels off".
- Touch targets 44×44px minimum (40×40 acceptable in dense desktop UI); extend with a pseudo-element rather than inflating the visual box. Never let two hit areas overlap.
- ~12px of breathing room between adjacent bordered controls.
- `h-dvh`, never `h-screen`. Respect `safe-area-inset` on fixed elements.
- Full-width buttons stop at the page margin, not the viewport edge.
- Set `aspect-ratio` on media so nothing jumps while it loads.
- A fixed z-index scale. No arbitrary z values.

### Interaction

- Every field gets a visible label. Placeholder text is never the label.
- Validation errors sit directly below their field, and errors surface where the action happened.
- `:focus-visible` rings on everything interactive, always visible.
- Destructive or irreversible actions go through an alert dialog.
- Empty states get exactly one clear next action, not just an explanation.
- Skeletons mirror the shape of the content they replace; prefer them to spinners.
- Never block paste in inputs.
- Status is never color alone — pair it with text or an icon.

### Motion (summary; full rules in `references/motion.md`)

- Don't animate unless it answers "what problem does this solve?"
- Interaction feedback ≤200ms; nothing in normal UI over 300ms.
- `ease-out` for entrances and exits. No custom curves unless asked.
- Animate `transform`/`opacity` only. Never `width`, `height`, `top`, `left`, `margin`, `padding`.
- High-frequency and keyboard-driven actions get no animation at all.
- Enter from ~95% scale, never from `scale(0)`.
- Respect `prefers-reduced-motion`.

### Icons

- Stroke matches text weight: 1.5px beside regular text, 2px beside semibold. One icon set per surface.
- Outline by default, filled for the active state. One `currentColor` SVG per icon, states via CSS — never separate assets per state.
- Optical alignment beats geometric centering; nudge when it looks off.
- `aria-label` on every icon-only button.

## References

| File | Covers |
| --- | --- |
| `references/motion.md` | Durations, easing, origin, interruptibility, staging, reduced motion |
| `references/typography.md` | Type scale, wrapping, numerals, measure, hierarchy |
| `references/layout-surfaces.md` | Radii, elevation, spacing, hit areas, scroll affordances, images |
| `references/color-a11y.md` | Palette structure, contrast, focus, dark mode, non-color signals |
| `references/stack.md` | Primitive and component-library choices, and how to combine them |
| `references/review.md` | Audit workflow and review output format |

Sources and attribution for these rules: `SOURCES.md` at the repo root.
