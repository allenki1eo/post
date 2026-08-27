# Motion

## The question that gates every animation

*What problem does this solve?* Valid answers: it explains what just happened, it gives feedback, it preserves spatial continuity, or it is a rare moment of delight. "It looked nicer in the demo" is not an answer. Sometimes the best animation is none.

## Frequency decides everything

| Frequency | Treatment |
| --- | --- |
| Hundreds of times a day (menus, list navigation, tab switches, command palette) | **No animation.** Instant. |
| Keyboard-initiated anything | **Never animate.** Motion reads as lag against key-press intent. |
| Occasional (modal, toast, drawer, popover) | Short, purposeful, ≤200ms |
| Rare (onboarding, first load, empty→filled transitions) | Delight is affordable; stagger is allowed |

An animation a power user triggers 300 times a day costs them 300 waits. A dropdown at 180ms feels responsive; the same dropdown at 400ms feels broken.

## Duration and easing

- Interaction feedback: **≤200ms**. Hard ceiling for any normal UI animation: **300ms**.
- **`ease-out` for entrances and exits.** `ease-in` on an opening surface feels sluggish because it starts slow exactly when the user is waiting.
- No custom cubic-beziers unless explicitly requested. If a project already has easing/duration tokens, use them — never invent a parallel scale.
- Prefer `ease-out` over springs for toggles, toasts, and other feedback: springs wobble, and wobble reads as instability in functional UI.
- If a spring is genuinely right (contextual icon swaps, drag release), use `bounce: 0`.

## Origin and physicality

- Popovers, menus, and tooltips animate **from the control that opened them** — set `transform-origin` to the trigger side, not `center`.
- Entrances start near **95% scale**, never `scale(0)`. Zero-scale entrances read as a pop, not a reveal.
- Enter and exit should mirror each other so the surface feels like one object.
- Exits are softer and shorter than entrances: a small fixed `translateY` (not a full-height collapse), then gone.
- Menus close with a short fade — don't fling them off screen.
- Cross-fade changing icons/labels with `opacity` + `scale` (0.25 → 1) + `blur` (4px → 0), rather than swapping visibility. A brief blur on a changing label hides the flash.

## Interruptibility

- Use **CSS transitions** for interactive open/close state — they can be interrupted and reversed mid-flight.
- Reserve `@keyframes` for staged sequences that run once.
- A user who hovers away mid-animation should not have to wait for a cycle to finish.

## Staging

- Stagger a first-load hero entrance by ~100ms per semantic chunk. Chunk by meaning (headline, subhead, actions), not by DOM node.
- Never stagger a routine interaction. Tab switches, hover, and keystroke feedback are instant.
- `initial={false}` on `AnimatePresence` so mounted content doesn't animate in on first render — then verify you didn't kill an intentional entrance.

## Performance

- Animate **compositor properties only**: `transform`, `opacity`. Never `width`, `height`, `top`, `left`, `margin`, `padding`.
- Paint properties (`background`, `color`) are acceptable only on small local elements — text, icons, a button surface.
- Never animate large `blur()` or `backdrop-filter` surfaces. Use a solid modal backdrop instead of a blurred one; a full-screen blur is expensive every frame.
- `will-change` only during an active animation, only on `transform`/`opacity`/`filter`, never `will-change: all`. Add it in response to observed first-frame stutter, not preemptively.
- Never `transition: all` — name the properties (`transition-property: transform, opacity`).
- Pause looping animations when off-screen.
- Avoid animating large images or full-screen surfaces.

## Accessibility

- Honor `prefers-reduced-motion`: drop movement, keep the state change (a fade or an instant swap is fine).
- Motion is never the only feedback channel. Every animated state change also needs a static cue: color, icon, label, or text.

## Tooltips (the special case)

- Delay before the **first** tooltip opens, so passing the cursor over a toolbar doesn't fire a cascade.
- Once one tooltip is open, neighboring tooltips open **immediately, with no animation** — the user has already declared intent.
