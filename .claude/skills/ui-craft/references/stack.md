# Stack

Decisions about *what to build on*, before writing a component.

## Order of preference

1. **The project's existing primitives.** Always first. A new dropdown that doesn't match the app's dropdown is a regression regardless of quality.
2. **An accessible headless primitive** for anything with keyboard, focus, or portal behavior — Base UI, Radix, or React Aria. Never hand-roll focus trapping, roving tabindex, or dismiss layers.
3. **A copy-and-own component library** when you want a styled starting point you can edit.
4. **Hand-built**, only for something genuinely custom with no interaction complexity.

**Never mix primitive systems inside one interaction surface.** A Radix dialog containing a Base UI popover containing a React Aria menu will fight over focus and dismissal. Pick one per surface.

## Libraries worth knowing

| Library | What it is | Reach for it when |
| --- | --- | --- |
| [Base UI](https://base-ui.com/react/components) | Unstyled, accessible React primitives from the Radix/MUI lineage | New primitives in a modern React app; the default recommendation |
| [coss ui](https://coss.com/ui) | ~70 styled components built on Base UI, explicitly built for developers and AI agents | You want Base UI behavior with a styled, copyable starting point |
| [ReUI](https://reui.io/components) | shadcn-ecosystem library, Tailwind + Radix/Base UI variants, copy-and-own | You're already in shadcn/Tailwind and need heavier pieces — data grid, kanban, event calendar, gantt, filters, file upload, timeline, stepper |
| Radix | The widely adopted primitive set | The project already uses it, or a dependency requires it |
| React Aria | Adobe's behavior/hook layer, strongest a11y coverage | Complex widgets (calendars, comboboxes, tables) and strict a11y requirements |

Copy-and-own means the source lands in your repo: you own the diff, you own the upgrades. That's a feature for a design-system codebase and a liability if you never intend to touch it.

## Styling and utilities

- Tailwind defaults unless the project already has custom values, or they're explicitly requested. Custom spacing/color/radius scales that duplicate the defaults are pure drift.
- `cn` (`clsx` + `tailwind-merge`) for conditional classes so later classes actually win.
- `size-*` instead of `w-* h-*` for square elements.
- `motion/react` (formerly `framer-motion`) when JS animation is genuinely needed; CSS transitions otherwise, since they're interruptible.
- `tw-animate-css` for small Tailwind entrance and micro-animations.

## React hygiene that shows up as UI bugs

- No `useEffect` for anything expressible as render logic — effect-derived state is what produces flashes of wrong UI.
- Don't reach for a state library to hold what a URL param or a form library already holds.
