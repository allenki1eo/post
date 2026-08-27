# Color & Accessibility

## Palette structure

- Build on a **neutral scale** (9–10 steps) that carries text, borders, muted states, and backgrounds. Most of a good interface is neutral.
- Reserve the darkest neutral for primary text and primary actions.
- **One accent per view.** Secondary and tertiary actions stay neutral. Headings stay neutral — the accent belongs to links and actions.
- Define **semantic colors** as tokens, not raw values: `danger`, `warning`, `success`, `info`, `disabled`, `surface`, `border`, `muted-foreground`. Components reference the semantic name, never the hex.
- Prefer a perceptual color space (OKLCH) when generating scales so steps are evenly spaced to the eye.
- Reach for existing theme tokens before introducing a new color.

## Contrast

- Text against its background: **AA (4.5:1)** minimum, 3:1 for large text. Muted text is the usual offender — check it.
- Check the pairings you actually ship: accent-on-surface, text-on-accent, border-on-background, disabled text.
- Non-text UI (icons, focus rings, control borders) needs 3:1 against adjacent color.

## Never color alone

- Status, validation, and selection must carry a second signal: an icon, a label, weight, or position. Color alone excludes color-blind users and dies in grayscale.

## Focus

- Every interactive element has a visible `:focus-visible` ring. Never `outline: none` without a replacement.
- The ring must clear the element (offset) and survive on both light and dark surfaces.
- Focus order follows visual order. Modals, drawers, and menus trap focus while open and return it to the trigger on close.

## Dark mode

- Dark mode is a token swap, not a filter. Define the full light palette on `:root` and redefine only the tokens in the dark block.
- Don't invert shadows — in dark UI, elevation comes mostly from lighter surfaces, with shadow as support.
- Re-check contrast in dark mode; a pairing that passes in light often fails inverted.

## Semantics and assistive tech

- Use the native element first (`button`, `a`, `label`, `fieldset`, `dialog`). Roles are a fallback, not a starting point.
- `aria-label` on every icon-only control.
- Announce dynamic state changes (loading, validation, toast) via live regions rather than assuming the visual change is enough.
- Never rebuild keyboard or focus behavior by hand when an accessible primitive exists.
- Honor `prefers-reduced-motion` and `prefers-color-scheme`.
