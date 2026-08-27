# Layout & Surfaces

## Radii

- **Concentric rule:** `outerRadius = innerRadius + padding`. A 8px-radius avatar inside 4px of padding wants a 12px container radius.
- Mismatched nested radii is the single most common reason a card looks amateur.
- Keep long-form content rectangular; radius is for controls, cards, dialogs, and code blocks.

## Elevation

- **Shadows for depth, borders for structure.** If a border exists only to suggest lift, replace it with layered transparent `box-shadow`.
- Keep structural and stateful borders: dividers, table rules, selected state, focus ring.
- Keep elevation subtle and on a fixed scale (project shadow tokens, or the Tailwind default scale). A ring like `ring-1 ring-black/10` often reads better than a solid border on large screens.
- Fixed z-index scale, no arbitrary values.

## Spacing

- Space on a consistent unit (4pt or 8pt). Every gap should be a multiple, not a nudge.
- Group with spacing before adding a divider. Dividers are for genuinely separate regions.
- ~12px between adjacent bordered controls so their borders don't visually merge.
- Consistent page margins on mobile; full-width buttons respect them rather than bleeding to the edge.

## Hit areas

- 44×44px for touch; 40×40px floor in dense desktop UI.
- Extend a small visual control with a pseudo-element instead of padding the visible box.
- Never let two hit areas overlap.

## Scroll affordances

- In a horizontal list, show 16–32px of the next item so the list reads as scrollable.
- Fade the edge of a scrollable region with `mask-image` to signal continuation.
- Use a real scroll container with `overflow-x: auto` for wide content (tables, code, diagrams) — the page itself should never scroll sideways.

## Images and media

- Set `aspect-ratio` so surrounding content doesn't shift during load.
- Add a hairline outline for depth: `oklch(0 0 0 / 0.1)` in light mode, `oklch(1 0 0 / 0.1)` in dark. Pure black/white only — a tinted neutral (slate, zinc) picks up the surface behind it and reads as grime on the edge.
- Provide fallbacks: `alt` text always, a defined fallback for avatars, and density-aware sources where it matters.

## Viewport

- `h-dvh`, not `h-screen` — mobile browser chrome makes `vh` lie.
- Respect `env(safe-area-inset-*)` for anything fixed to an edge.
