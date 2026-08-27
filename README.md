# UI Skills

Distilled UI craft rules, packaged as Claude Code skills so any session in this repo picks them up automatically.

## What's here

```
.claude/skills/
├── ui-craft/                  Building and reviewing interfaces
│   ├── SKILL.md               Core rules — restraint, type, layout, interaction, motion, icons
│   └── references/
│       ├── motion.md          Duration, easing, origin, interruptibility, staging, reduced motion
│       ├── typography.md      Wrapping, numerals, measure, hierarchy, rendering
│       ├── layout-surfaces.md Radii, elevation, spacing, hit areas, scroll affordances, images
│       ├── color-a11y.md      Palette structure, contrast, focus, dark mode, non-color signals
│       ├── stack.md           Primitives and component libraries, and how to combine them
│       └── review.md          Audit workflow, severity model, review output format
└── design-system-checklist/   Planning and auditing a design system
    ├── SKILL.md               Foundations, component definition of done, audit workflow
    └── CHECKLIST.md           Full inventory: foundations, language, ~30 components, maintenance
```

## Using it

**In Claude Code** — skills in `.claude/skills/` load automatically for sessions in this repo. Invoke one explicitly with `/ui-craft` or `/design-system-checklist`, or just describe the work ("this dropdown feels off", "audit our tokens") and the description frontmatter routes it.

**Elsewhere** — the files are plain Markdown. Paste `ui-craft/SKILL.md` into any agent as a system rule, or read it yourself.

## The two rules behind all the other rules

**Frequency decides motion.** An animation on something a user triggers 300 times a day costs them 300 waits. High-frequency and keyboard-driven interactions get no animation; rare moments can afford delight.

**Restraint reads as quality.** One accent per view, neutral headings, spacing before dividers, shadows for depth and borders for structure. Most of what makes UI look AI-generated is additive — gradients, glow, four accent colors, motion on everything.

## Sources

Every rule here traces to a source listed in [SOURCES.md](SOURCES.md), with what was taken from each.
