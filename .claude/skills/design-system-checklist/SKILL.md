---
name: design-system-checklist
description: Audit or plan a design system — tokens, foundations, component coverage, documentation, and contribution process. Use when starting a design system, adding a component to one, reviewing whether a UI library is production-ready, or deciding what a system still needs.
---

# Design System Checklist

Two things this skill does:

- **Audit** an existing system against `CHECKLIST.md` and report the gaps that matter.
- **Ship a component** into a system so it's actually done, not just rendered.

`CHECKLIST.md` holds the full inventory: foundations, design language, ~30 core components, and maintenance. It's an audit instrument, not a gate — a three-screen product does not need a contribution SLA. Tick an item only when it's documented where a teammate can find it.

## Foundations first

Everything downstream inherits from these. Get them wrong and every component carries the error.

| Foundation | What "done" means |
| --- | --- |
| **Color** | Neutral scale + semantic tokens (`danger`, `success`, `disabled`, `surface`, `border`); AA contrast on real shipped pairings; a dark palette defined as a token swap; written guidance on when to use each |
| **Layout** | One base unit (4pt/8pt) with every spacing value a multiple; a grid defined per breakpoint with columns, gutters, margins; a named breakpoint set |
| **Typography** | A scale that maps to purpose, not size; per-breakpoint sizing; measure and line-height rules; a font-loading strategy that doesn't shift layout |
| **Elevation** | A fixed shadow scale, a matching surface-color story for dark mode, and a fixed z-index scale |
| **Motion** | Named easing tokens, a duration scale, and a `prefers-reduced-motion` rule |
| **Iconography** | One grid size, one stroke weight per weight-pair, a naming convention, keyword/alias list, reserved icons that never get reassigned, and accessible labeling rules |

Tokens are the contract. Components reference token names; nothing in a component references a raw hex, px, or ms.

## Component definition of done

Before a component counts as part of the system, all of it:

**States** — default, hover, focus-visible, active, disabled, loading, error, empty, selected. Every one designed, not defaulted.

**Structure** — documented anatomy; a props/variant API that matches the design vocabulary; composition examples for the two or three real ways it gets used.

**Accessibility** — correct native element or role; keyboard support (including arrow-key navigation and Escape where applicable); focus management and trapping for overlays; labels and descriptions wired; state changes announced.

**Responsiveness** — behavior at each breakpoint, touch targets ≥44px, no horizontal page scroll.

**Content** — what happens with a long label, no label, an empty list, an error string, a translated string that's 40% longer, RTL.

**Docs** — when to use it, when *not* to use it, and the nearest alternative.

## Auditing a system

1. Inventory what exists — components, tokens, docs — before comparing to the checklist.
2. Walk `CHECKLIST.md` and mark each item present / partial / missing.
3. Report the **foundations gaps first**: a missing semantic color scale is worth more than five missing components.
4. Group findings by leverage, not by checklist order. Name the concrete artifact each gap needs (a token file, a doc page, a state).
5. Say plainly which items are deliberately out of scope for this product's size instead of listing them as failures.

## Maintenance is part of the system

A system with no owner, no release cycle, and no contribution path decays into a component folder. The maintenance section of `CHECKLIST.md` covers documentation, local libraries, team process, support channels, and contribution rules — audit them the same way.
