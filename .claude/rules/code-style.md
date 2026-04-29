# Code Style

## Code Review Context

Every diff is reviewed by **OpenAI Codex** and **GitHub Copilot**. Assume an adversarial second pair of eyes: names must read correctly out of context, functions stay small and single-purpose, no dead code or commented-out blocks, no unexplained magic numbers. If a reviewer would ask "why is this here?", make the answer obvious or do not write it.

## Copyright Header

ResoPulse is MIT-licensed. See `LICENSE` at the repo root for the full text.

Every source file (`.vue`, `.ts`, `.tsx`, `.js`) begins with:

```
// Copyright © 2026 Tomer Preis. Licensed under the MIT License.
```

`.vue` files use the HTML comment form on line 1, before `<template>`:

```vue
<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
```

Never omit, shorten, or reword. When editing a file missing the header, add it as the first action.

## Clean Code

### Naming
- **Functions** — verb phrases: `computeTau()`, `triggerLysis()`, `formatFreqKHz()`
- **Booleans** — `is`/`has`/`should` prefix: `isAcousticTarget`, `hasNuclearParams`
- **Constants** — SCREAMING_SNAKE_CASE (module-level); PascalCase for enum-like objects (`CELL_STATE`, `ICON`)
- No abbreviations unless domain-standard (`Vm`, `DR`, `fc`, `SAR`)
- No single-letter variables except loop counters (`i`, `j`) and physics shorthand (`d`, `s`, `c`) inside math functions

### Functions
- Single responsibility, ≤ 20 lines where possible
- No side effects beyond the stated purpose
- Pure physics functions live in `utils/physics.ts` with no store/Vue imports
- No boolean flag arguments — split into two named functions

### Comments
- **Default: write no comments.** The code should be self-documenting.
- **When you must comment, condense ruthlessly.** One short line. Never multi-paragraph. Never narrate what the code does — explain *why* only when the reason is non-obvious (hidden constraint, subtle invariant, bug workaround).
- JSDoc on exported functions: `@param`, `@returns`, and a one-line summary. Nothing more.
- Never leave commented-out dead code — git history recovers it.
- Never reference the current task, fix, or caller ("used by X", "added for Y") — those rot.

### Error handling
- Never silently swallow errors — log or rethrow
- Guard clauses at the top of functions, not deep nesting
- Validate only at system boundaries (user input, socket packets, CSV import)

### File organisation
- One concept per file
- Import order: Vue core → third-party → `@/stores` → `@/services` → `@/components` → `@/utils` → `@/theme` → `@/constants` → `@/types` → relative siblings
- One blank line between groups; omit empty groups; no blank lines within a group
- `type Foo = ...` aliases go **after** all imports, not between them

```ts
// ✓ correct
import { defineComponent } from 'vue'
import { mapStores } from 'pinia'

import { useCellStore } from '@/stores/cellStore'

import { ICON } from '@/constants/icons'
import { UNIT } from '@/constants/units'

import MyComp from './MyComp.vue'

type Store = InstanceType<typeof useCellStore>
```

## No Magic Numbers

Never inline a raw numeric constant.

- Physics → `constants/physics.ts`
- Slider bounds → `constants/sliderBounds.ts`
- Experiment defaults → `constants/experimentDefaults.ts`

```ts
// ✗ wrong
const tau = cell.radius * 1e-6 * Cm * (2 * 1.5 + 0.5) / (2 * 1.5 * 0.5)

// ✓ correct
const tau = computeTau(cell, sigma_e)
```

## File and Folder Naming

### Component files
- **PascalCase** for `.vue` files and component folders: `CellCard.vue`, `CellCard/`, `FrequencySlider/`
- Multi-file components live in their own folder with `index.vue`:
  ```
  components/CellCard/
    index.vue          ← public entry, imported as CellCard
    CellHeader.vue     ← private sub-component
    CellParamsPanel.vue
  ```
- Single-file components sit flat in `components/`: `NavBar.vue`, `StatCard.vue`

### Non-component source files
**camelCase** for stores, utils, services, types, constants: `cellStore.ts`, `physics.ts`, `socket.ts`.

### Folder ownership
Sub-components inside a component folder are **private**. Only import through the folder's `index.vue` — never reach into `CellCard/CellHeader.vue` from a view.

### views/ vs components/
- `views/` — one file per route: `HomeView.vue`, `ExperimentView.vue`
- `components/` — reusable UI pieces
- Views never import views; components never import views

## Responsive Design

Every UI element must consider narrow viewports.

- Decorative elements (side panels, ambient animations, overlays) are **hidden on small screens** via `min-width` media queries (`1300px` for wide decorations, `768px` standard)
- Default `display: none`; switch to `display: flex`/`block` only inside the media query
- The page must remain fully functional with every decorative element hidden

```scss
// ✓ correct
.home__side-panel {
  display: none;
  @media (min-width: 1300px) { display: flex; }
}
```
