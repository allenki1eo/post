# Typography

## Wrapping

- `text-wrap: balance` on headings — keeps multi-line titles from leaving a single orphan word.
- `text-wrap: pretty` on body copy — fixes orphans without the cost of balancing long text.
- `line-clamp`/`truncate` in dense UI where space is genuinely fixed.
- Prefer a `mask-image` fade over a hard ellipsis when a label runs long inside a control — the fade reads as "there is more", the ellipsis reads as "cut".

## Numerals

- `font-variant-numeric: tabular-nums` for anything that updates in place (timers, counters, prices, live metrics) and for any column of numbers. Proportional digits cause visible width jitter on every tick.

## Measure and rhythm

- Body text: 60–75 characters per line.
- Short headings: line-height near 1.1. Body: 1.5–1.6.
- Large display text usually needs slightly tighter letter-spacing. Everything else: leave tracking alone unless asked.
- Keep body copy at the base size; build hierarchy with weight, color, and spacing before reaching for another size step.

## Casing and voice

- Sentence case for labels, buttons, links, menu items, and section headers. No all-caps UI labels.
- Match the terminology already used in the product; don't introduce a synonym for an existing concept.

## Rendering

- `-webkit-font-smoothing: antialiased` on the root for macOS — default rendering reads heavy at UI sizes.
- Let long technical strings (IDs, paths, tokens) wrap or scroll rather than overflowing; use a mono face for them.

## Hierarchy

- Three levels of emphasis on a surface is usually the limit: primary text, secondary text, muted metadata.
- Muted text still needs real contrast — "muted" is a color decision, not permission to fall below AA.
