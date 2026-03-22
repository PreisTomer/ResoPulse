# ResoPulse — Claude Code Instructions

These rules apply to **every code change** in this project. They are not suggestions.

---

## Lab Context — In-Vitro Digital Twin (Read First)

This application is a **virtual in-vitro laboratory** — a digital twin of a cuvette or well-plate electroporation / acoustic resonance experiment on single cells or cell suspensions. The user is a bench scientist designing or understanding a cell biology protocol, not a clinician treating a patient.

**Every piece of user-visible text — labels, tooltips, descriptions, protocol docs, error messages — must be written for the lab bench, not the clinic.** Before writing any string, ask: *"Does this make sense to a scientist running an experiment on cells in a dish?"*

### Allowed terminology
- "target cell" / "reference cell" / "healthy cell" — cell populations being modelled
- "cell lysis", "membrane disruption", "pore formation" — outcome descriptions
- "protocol window", "selectivity ratio", "Therapeutic Index" — biophysics model terms (TI is a biophysics metric, not a clinical metric)
- "cuvette", "well plate", "electrode gap", "EP buffer", "cell suspension" — lab hardware/context
- "pulse generator", "function generator", "RF amplifier" — lab instrument references
- "co-culture assay", "population lysis fraction", "viability" — experimental outcomes

### Forbidden framings
- Clinical procedures: "patient", "surgery", "implant", "probe", "catheter", "clinical device"
- Clinical outcomes: "tumour ablation zone", "treatment", "clinical window", "clinical advantage"
- In-vivo context: "tissue penetration for patient treatment", "in-vivo protocol", "animal model outcome" (literature citation bodies may quote paper titles verbatim, but annotation notes must reframe to lab-model relevance)
- Regulatory language: "FDA", "approval", "contraindication", "prescribe"

### When physics has both in-vitro and in-vivo literature
Describe the parameter's effect in the simulation model. For example: *"Lower σ_e shifts τ and f_c — relevant when modelling cells in low-conductivity EP buffer"* rather than *"used in intravascular catheter IRE"*.

---

## Copyright Header

**Every source file** (`.vue`, `.ts`, `.tsx`, `.js`) must begin with this exact comment:

```
// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.
```

For `.vue` files the comment goes in the very first line **before `<template>`**:

```vue
<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
```

- Never omit or shorten the copyright line
- When creating a new file, add it before writing any other content
- When editing an existing file that is missing this header, add it as the first action

---

## Clean Code Standards

All code must conform to *Clean Code* (Robert C. Martin) principles. The checklist below is non-negotiable:

### Naming
- **Functions** — verb phrases describing what they do: `computeTau()`, `triggerLysis()`, `formatFreqKHz()`
- **Booleans** — `is`/`has`/`should` prefix: `isAcousticTarget`, `hasNuclearParams`, `shatterPending`
- **Constants** — SCREAMING_SNAKE_CASE for module-level constants; PascalCase for enum-like objects (`CELL_STATE`, `ICON`)
- No abbreviations unless domain-standard (`Vm`, `DR`, `fc`, `SAR`)
- No single-letter variables except loop counters (`i`, `j`) and physics shorthand (`d`, `s`, `c` inside math functions)

### Functions
- **Single responsibility** — each function does one thing and does it well
- **Small** — aim for ≤ 20 lines; anything longer should be split or documented with a clear reason
- **No side effects** beyond the function's stated purpose
- **Pure physics functions** live in `utils/physics.ts` and have no store/Vue imports
- **No boolean flag arguments** — split into two named functions instead

### Comments
- Comments explain *why*, not *what* — the code should be self-documenting
- JSDoc on exported functions: `@param`, `@returns`, and a one-line summary
- Inline `// ──` divider comments for logical sections inside long functions
- Delete commented-out dead code; use git history to recover it

### Error handling
- Never silently swallow errors — log or rethrow
- Guard clauses at the top of functions (early return) rather than deep nesting
- Validate only at system boundaries (user input, socket packets, CSV import)

### File organisation
- One concept per file; do not mix unrelated utilities in the same module
- Imports ordered: Vue core → third-party → `@/stores` → `@/utils` → `@/constants` → `@/types` → relative siblings

---

## Vue File Structure

Every `.vue` file must follow this exact block order:

```
<template>   ← always first
<script lang="ts">  ← always second
<style lang="scss" scoped>  ← always last (only where applicable)
```

- **Always use `<style lang="scss" scoped>`** — no exceptions
- Every component — including sub-components like `CellHeader.vue`, `ProtocolSection.vue` — owns **its own scoped style block** with styles for the elements it renders
- A parent component's scoped styles cover only elements **directly in its own template**; they do not reach into child component internals
- **`:deep()` is reserved for genuinely unavoidable cases only** — e.g. overriding an external UI library (Vuetify, PrimeVue) or a third-party widget. Never use it to style elements rendered by your own sub-components
- All components use **Options API** (`export default defineComponent({})`) — never Composition API (`setup()` at component level)

---

## File and Folder Naming Conventions

### Component files
- **PascalCase** for every `.vue` file: `CellCard.vue`, `NavBar.vue`, `HeroRingsSvg.vue`
- **PascalCase** for every component folder: `CellCard/`, `FrequencySlider/`, `Home/`
- Multi-file components live in their own folder with an `index.vue` entry point:
  ```
  components/
    CellCard/
      index.vue          ← public entry point, imported as CellCard
      CellHeader.vue     ← sub-component, not imported outside this folder
      CellParamsPanel.vue
  ```
- Single-file components that have no sub-components sit directly in `components/` as a flat `.vue` file: `NavBar.vue`, `StatCard.vue`

### Non-component source files
- **camelCase** for everything else: stores, utils, services, types, constants
  ```
  stores/cellStore.ts
  utils/physics.ts
  services/socket.ts
  types/cell.ts
  constants/physics.ts
  ```

### Folder ownership rule
Sub-components inside a component folder (`CellCard/CellHeader.vue`) are private to that component. They must **not** be imported directly by views or other components — always import through the folder's `index.vue`.

### views/ vs components/
- `views/` — one file per route, named after the route: `HomeView.vue`, `ExperimentView.vue`
- `components/` — reusable UI pieces consumed by views or other components
- Views never import other views; components never import views

---

## No Magic Numbers

Never write a raw numeric constant inline. Always use a named constant.

- Physics values → `constants/physics.ts`
- Slider bounds → `constants/sliderBounds.ts`
- Experiment defaults → `constants/experimentDefaults.ts`

```ts
// ✗ wrong
const tau = cell.radius * 1e-6 * Cm * (2 * 1.5 + 0.5) / (2 * 1.5 * 0.5)

// ✓ correct
import { KOTNIK_NUMERATOR_FACTOR } from '@/constants/physics'
const tau = computeTau(cell, sigma_e)
```

---

## Responsive Design — Phone and Small Screens

Always consider phone and small screen sizes when adding any UI element.

- Decorative elements (side panels, ambient animations, illustration overlays) **must be hidden on small screens** using a `min-width` media query (typically `1300px` for wide decorations, `768px` for standard responsive breakpoints)
- Never let decorative content overflow or obscure data on narrow viewports
- Add `display: none` as the default and `display: flex` / `display: block` only inside the media query
- Test that all new elements degrade gracefully — if hidden at small sizes, the page must still be fully functional

```scss
// ✓ correct — decorative panel hidden on small screens
.home__side-panel {
  display: none;
  @media (min-width: 1300px) { display: flex; }
}
```

---

## Punctuation Style

Do not use em dashes (—) or en dashes (–) in any user-visible text: locale strings, tooltips, descriptions, notes, or comments rendered to the UI.

**Acceptable exception:** a lone `—` as a "no value" placeholder in table cells where a data point does not apply (e.g. resonance frequency for mammalian cells, DEP crossover when none exists in range). This is a scientific table convention and is allowed.

Use commas, colons, parentheses, or rephrase the sentence instead of dashes in all other cases.

---

## No Hardcoded Text or Units

**All user-visible strings** must come from one of:
- `locales/en.json` (via `$t('key')` in templates or `this.$t('key')` in scripts) — for UI labels, tooltips, descriptions
- `constants/strings.ts` — for domain string constants (`CELL_LABEL`, `CELL_STATE`, `CHART_MODE`, etc.)
- `constants/icons.ts` — for all icon characters (`ICON.STAR`, `ICON.WARNING`, etc.)
- `constants/units.ts` — for all unit strings (`UNIT.KHZ`, `UNIT.V_PER_CM`, etc.)

```ts
// ✗ wrong
label: `${value} kHz`
tooltip: 'Healthy cell threshold voltage'
icon: '⭐'

// ✓ correct
label: `${value} ${UNIT.KHZ}`
tooltip: this.$t('cell.tipThreshold')
icon: ICON.STAR
```

**Cell role labels** (`'H'` / `'T'`): always use `CELL_LABEL.HEALTHY` / `CELL_LABEL.TARGET` from `constants/strings.ts`.

### Tooltip Strings — Strictly Forbidden Patterns

**Never write tooltip text inline in a template or as a raw string in a computed property.**

```ts
// ✗ WRONG — inline hardcoded string in template
v-tip="'<strong>Cell Parameters</strong>\nEdit biophysical properties...'"

// ✗ WRONG — raw template literal in computed
tipVm(): string {
  return `<strong>Transmembrane Potential</strong>\nCurrent: ${this.vmDisplay}…`
}

// ✓ CORRECT — locale key for static tooltips
v-tip="$t('cellCard.tipParamsToggle')"

// ✓ CORRECT — utility function for dynamic tooltips (physics values interpolated)
tipVm(): string {
  return tipVmFn({ vmDisplay: this.vmDisplay, disruptionRatio: this.disruptionRatio, … })
}
```

Dynamic tooltip builders that interpolate live physics values belong in `utils/<domain>Tooltips.ts`
(e.g. `cellCardTooltips.ts`, `sliderTooltips.ts`, `selectivityTooltips.ts`). Static labels and
descriptions belong in `locales/en.json`. **Never write them inline.**

---

## CSS — Write Once, Token Always

Before writing any CSS property value or repeating any property group, apply this checklist in order:

1. **Is there a CSS custom property for this value?** → Use `var(--token)`. Never write a raw hex, rgba, rem, opacity, or transition value when a token exists. See the full token tables in [CSS Design Tokens](#css-design-tokens--mandatory-usage).
2. **Is there an SCSS mixin that generates this property group?** → Call `@include mixin()`. Never copy-paste the same 3+ property block when a mixin already covers it. See the full mixin table in [SCSS Mixin Library](#scss-mixin-library--use-before-writing-inline).
3. **Is this color value a tint/opacity variant of a base color?** → Use `color-mix(in srgb, var(--color-X) Y%, transparent)`. Never write raw `rgba()`.
4. **Is this a new repeated pattern that appears in 2+ places?** → Add a mixin to `src/styles/_mixins.scss` or a token to `src/style.css` before duplicating.

```scss
// ✗ wrong — raw values, repeated block, no tokens
.my-label {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  opacity: 0.55;
  transition: color 0.15s;
}

// ✓ correct — mixin + tokens
.my-label {
  @include mono-upper(var(--fs-xxs));
  opacity: var(--op-muted);
  transition: color var(--tr-fast);
}
```

---

## BEM + Nested SCSS

Use BEM naming with SCSS nesting. Never write flat selectors.

```scss
// ✗ wrong
.card-header { }
.card-header-title { }
.card-header-title--active { }

// ✓ correct
.card {
  &__header { }
  &__title {
    &--active { }
  }
}
```

BEM nesting (`&__element`, `&--modifier`) works correctly inside `<style lang="scss" scoped>` — **as long as you are styling elements rendered by the same component**. SCSS's `&` cannot append a text suffix to `:deep(...)`, so never nest `&--modifier` or `&__element` inside a `:deep()` block.

### Single BEM block per component

Every component's style block must have **one root BEM block**. All elements and modifiers nest inside it using `&__element` / `&--modifier`. Never scatter sibling top-level selectors.

```scss
// ✗ wrong — flat siblings at top level
.experiment__header { }
.experiment__header-left { }
.experiment__chip { }
.experiment__chip-dot { }

// ✓ correct — one root, full nesting
.experiment {
  &__header {
    &-left { }
    &-right { }
  }
  &__chip {
    &-dot { &--warn { } }
    &--connected { }
  }
}
```

When a component's root element has class `experiment__header`, the SCSS block root is `.experiment` — because `experiment` is the BEM block and `header` is the element. All child classes (`experiment__chip`, `experiment__cell-badge`, etc.) then nest as `&__chip`, `&__cell-badge`, etc.

### Nest media queries inside the element they affect

```scss
// ✗ wrong — media queries as flat siblings at end of file
.experiment__header { padding: 1rem; }
@media (max-width: 768px) { .experiment__header { padding: 0.5rem; } }

// ✓ correct — media query nested inside the element
.experiment {
  &__header {
    padding: 1rem;
    @media (max-width: 768px) { padding: 0.5rem; }
  }
}
```

- Vendor-prefixed properties must always be paired with the standard property:
  ```scss
  -moz-appearance: none;
  appearance: none;
  ```

---

## CSS Design Tokens — Mandatory Usage

**Never write a raw CSS value when a design token exists.** The full token set lives in `src/style.css :root`. Use the correct token in every `<style>` block and `.scss` file.

### Font sizes — `--fs-*`

| Token | Value | Use for |
|-------|-------|---------|
| `var(--fs-xxs)` | 0.65rem | Section titles, formula annotations, badge labels |
| `var(--fs-xs)` | 0.70rem | Secondary mono data, stat sub-labels |
| `var(--fs-sm)` | 0.75rem | Primary mono labels, key data values |
| `var(--fs-md)` | 0.82rem | Readable data / body labels |
| `var(--fs-lg)` | 0.875rem | Standard body text |
| `var(--fs-xl)` | 0.90rem | Significant labels, readout sub-text |

```scss
// ✗ wrong
font-size: 0.65rem;
font-size: 0.70rem;

// ✓ correct
font-size: var(--fs-xxs);
font-size: var(--fs-xs);
```

Values that do not map to the scale (e.g. `0.6rem` for a deliberate micro-size below the scale) are acceptable exceptions — comment why.

### Opacity — `--op-*`

| Token | Value | Use for |
|-------|-------|---------|
| `var(--op-ghost)` | 0.35 | Near-invisible decorations, disabled states |
| `var(--op-muted)` | 0.55 | Secondary text overlays, placeholder hints |
| `var(--op-dim)` | 0.70 | Tertiary badges, background labels |
| `var(--op-partial)` | 0.80 | Inactive elements, faded highlights |
| `var(--op-strong)` | 0.90 | Near-opaque elements, strong overlays |

```scss
// ✗ wrong
opacity: 0.35;
opacity: 0.55;
opacity: 0.80;

// ✓ correct
opacity: var(--op-ghost);
opacity: var(--op-muted);
opacity: var(--op-partial);
```

**Exception:** Raw numeric opacity values are required inside `@keyframes` animation blocks — CSS variables are not interpolated there.

### Transitions — `--tr-*`

| Token | Value | Use for |
|-------|-------|---------|
| `var(--tr-fast)` | 0.15s ease | Micro-interactions: thumb glow, icon swap |
| `var(--tr-normal)` | 0.20s ease | Hover states, badge colour shifts |
| `var(--tr-slow)` | 0.30s ease | Panel open/close, accordion expand |

```scss
// ✗ wrong
transition: color 0.15s, border-color 0.15s, background 0.15s;
transition: transform 0.2s ease;

// ✓ correct
transition: color var(--tr-fast), border-color var(--tr-fast), background var(--tr-fast);
transition: transform var(--tr-normal);
```

Multi-property transitions: replace each duration separately, do **not** collapse into a single `var(--tr-fast)` unless using `transition: all`.

Off-scale durations (`0.1s`, `0.18s`, `0.7s`, `1s`, entrance animations) are acceptable — leave them as raw values.

### Border radius — `--radius` / `--radius-lg`

```scss
// ✗ wrong
border-radius: 8px;
border-radius: 12px;

// ✓ correct
border-radius: var(--radius);     // 8px
border-radius: var(--radius-lg);  // 12px
```

Fine-detail radii (`2px`, `3px`, `4px`, `5px`, `6px`, `10px`) and partial-corner values (`8px 0 0 8px`) stay as raw values.

### Colors — `--color-*`

All color values must use CSS custom properties. Never write raw hex or `rgba()` in style blocks.

```scss
// ✗ wrong
color: #fbbf24;
background: rgba(0, 212, 255, 0.08);

// ✓ correct
color: var(--color-amber);
background: color-mix(in srgb, var(--color-primary) 8%, transparent);
```

For opacity tints, use `color-mix(in srgb, var(--color-X) Y%, transparent)` — not raw rgba. Named semantic tint tokens (`--color-primary-surface`, `--color-danger-border`, etc.) are also available and preferred when the percentage matches.

D3/canvas contexts that cannot evaluate CSS variables must use the named constants from `src/theme/colors.ts` (`C.amber`, `C.primary`, etc.).

---

## SCSS Mixin Library — Use Before Writing Inline

Before writing any repeated CSS pattern, check if a mixin already exists in `src/styles/_mixins.scss`. **Always prefer a mixin call over repeating the same property group.**

| Mixin | Signature | What it generates |
|-------|-----------|-------------------|
| `flex-row` | `($gap: 0.5rem)` | `display:flex; align-items:center; gap:$gap` |
| `flex-col` | `($gap: 0.5rem)` | `display:flex; flex-direction:column; gap:$gap` |
| `flex-between` | `($gap: 0)` | flex + space-between + optional gap |
| `inline-flex-center` | `()` | `display:inline-flex; align-items:center; justify-content:center` |
| `surface-card` | `($radius, $padding)` | bg + border + radius base for panels |
| `mono-upper` | `($size, $spacing)` | `font-mono + uppercase + letter-spacing` |
| `badge-pill` | `($padding, $radius)` | mono-caps inline label with border and rounded corners |
| `table-header-cell` | `($overlay)` | mono-caps + muted color + overlay bg for `<th>` |
| `status-strip` | `($color, $bg, $border, $anim, $dur)` | coloured alert strip inside cell cards |
| `section-title` | `()` | tiny mono-caps label for named data sections |
| `accordion-header` | `()` | shared collapse-toggle button |
| `row-label` | `()` | mono uppercase label for slider rows |
| `slider-track` | `()` | `<input type="range">` appearance reset |
| `slider-thumb` | `($bg, $shadow)` | webkit + moz thumb styling |
| `readout-step-btn` | `()` | +/- increment buttons beneath readout |
| `readout-inline-input` | `()` | click-to-edit number input overlay |
| `info-panel` | `($bg, $border-color)` | tinted bordered section panel |
| `cell-state-classes` | `()` | generates `&__state--<name>` rules from state map |
| `data-value-classes` | `($mono-size, $muted-opacity)` | mono/muted/cancer/warn value classes for data tables |

```scss
// ✗ wrong — writing the 3-property cluster manually
font-family: var(--font-mono);
font-size: var(--fs-xxs);
text-transform: uppercase;
letter-spacing: 0.08em;
display: inline-flex;
padding: 0.15rem 0.5rem;
border-radius: 3px;
border: 1px solid;

// ✓ correct — use the mixin
@include badge-pill();
```

### Keyframes — centralised in `src/styles/_keyframes.scss`

All shared keyframe animations live in `_keyframes.scss`. **Never duplicate a keyframe in a component's `<style>` block if it is already defined globally.**

Global keyframes are accessible from all scoped style blocks without any import — do NOT redefine them locally.

```scss
// ✗ wrong — duplicated in ProtocolSection.vue AND FieldRow.vue
@keyframes state-blink { ... }

// ✓ correct — defined once in _keyframes.scss, used everywhere
// (no import needed in scoped blocks)
animation: state-blink 1.6s ease-in-out infinite;
```

When adding a new keyframe used by more than one component, add it to `_keyframes.scss`, not to the component file.

---

## Constants Files — What Goes Where

| File | Contents |
|------|----------|
| `constants/physics.ts` | Named physics constants (ε₀, Boltzmann, thresholds, factors) |
| `constants/units.ts` | `UNIT` object — all display unit strings |
| `constants/strings.ts` | `CELL_LABEL`, `CELL_STATE`, `CELL_TYPE`, `CHART_MODE`, `WAVEFORM`, `LOG_EVENT`, `PRESET_ID`, etc. |
| `constants/icons.ts` | `ICON` object — all unicode/emoji icon characters |
| `constants/cellLibrary.ts` | `CellPreset` entries (10 presets) |
| `constants/sliderBounds.ts` | Slider min/max/step/default values |
| `constants/experimentDefaults.ts` | Category-specific default field params |
| `constants/cellCard.ts` | Cell card display config |

---

## TypeScript Patterns

- Fixed-length arrays: use tuple type `[CellConfig, CellConfig]` to avoid `| undefined`
- Dynamic property access: `(cell as unknown as Record<string, number>)[key]`
- Timer types: `ReturnType<typeof setInterval>` / `ReturnType<typeof setTimeout>`
- Pinia getters — state only: arrow function; needs other getters: method syntax with `const state = this as unknown as CellStoreState`
- Module-level functions are **not** accessible in Vue templates — must be in `methods: {}`

---

## Store ↔ Component Consistency

When a store serialises data (e.g. CSV export in `experimentStore`), the field names, order, and units **must exactly match** what is rendered on screen. If a display label changes, update the export header too.

---

## Build Verification

After every change run:
```bash
cd frontend && npm run build
```
Zero TypeScript errors is the acceptance criterion. Do not consider a task done until the build passes.

---

## Cross-Cutting Impact Checklist

Any time a feature is added, a physics model is updated, or existing behaviour changes, **audit every affected surface before considering the task done**. Changes rarely live in a single file.

When you modify or add something, ask: *"What else knows about this?"*

| Surface | What to check |
|---------|---------------|
| `views/ProtocolView.vue` | Scientific documentation — formulas, step descriptions, literature references, warn-boxes |
| `utils/cellAnimation.ts` | Blob animation — does the new state/parameter need a visual representation? |
| `services/socket.ts` + `backend/src/socket.ts` | Socket packets — new fields must be added to both sides; rename/remove must be synchronised |
| `stores/experimentStore.ts` + `components/ExperimentLog.vue` | CSV export columns and on-screen log table — labels, order, and units must match display |
| `views/ReportsView.vue` | Summary stats and full log table — add/remove columns to mirror the log |
| `views/DataSetsView.vue` | Cell library table, media table, therapeutic window — update computed values and notes |
| `components/SelectivityPanel/` | Warnings, badges, comparison table — reflect new thresholds or model constraints |
| `components/FrequencyResponseChart/` | Axes, legend items, overlay lines — new computed quantities may need chart representation |
| `locales/en.json` | i18n keys — every new label, tooltip, or description needs a translation entry |
| `constants/` files | Remove constants that are no longer referenced; add new ones following the correct file (see Constants Files table) |
| `types/` files | Add/remove TypeScript types and unions that model the new behaviour |

**Tree-shaking**: After any removal, search the codebase for all references to the deleted symbol (`Grep` before deleting). If nothing imports it, remove it. Do not leave dead code.

---

## Scientific Rigour

- PhD-level accuracy on all physics — verify formulas before documenting claims
- Never round or approximate constants in code — use full precision values
- All physics constants must live in `constants/physics.ts` with full precision and a named identifier

### Membrane Voltage — Schwan Equation
*Reference: Kotnik & Miklavcic 2000*

```
Vm(f) = 1.5 · E · R · cosθ / √(1 + (ω·τ)²)
τ = R · Cm · (2σ_e + σ_i) / (2σ_e · σ_i)
Cm = ε_r · ε₀ / d_mem
fc = 1 / (2π·τ)
```

- `cosθ = 1` for field-aligned pole; expose as `orientationDeg` slider
- `σ_e(T) = σ_e0 × (1 + 0.02 × (T − 37))` — temperature-corrected conductivity
- High-frequency selectivity limit: `sel(f≫fc) = (R_T·τ_H)/(R_H·τ_T)` — can be sub-unity
- Quasi-DC Vm is **independent of medium conductivity** (σ_e only affects τ and fc)

### SAR and Thermal Model
*Reference: Pennes 1948 bioheat; Newton cooling approximation*

```
α  = 3σ_e / (2σ_e + σ_i)          ← internal-field coupling factor
SAR = σ_i · α² · E² · wf / ρ      ← wf = duty-cycle weighted factor
T_ss = 37 + SAR · dc / (λ · cp)   ← steady-state temperature rise
λ = 0.02 s⁻¹                       ← Newton cooling rate constant
```

- `α` is **not** `(σ_e + σ_i) / 2` — that form is wrong
- Waveform factor `wf`: CW = 1.0; pulsed = duty cycle

### Electroporation — Lysis and Pulse Envelope
*Reference: Weaver & Chizmadzhev 1996*

```
pulseEnvelopeFactor = 1 − exp(−t_p / τ)   ← fraction of RC charge reached
disruptionRatio     = Vm_eff / V_threshold
```

- Pulse envelope factor applies to IRE mode only; CW and resonance modes use factor = 1.0
- Reversible EP (rev-ep): 50–85% DR — membrane transiently permeabilised, recoverable
- Lysis (irreversible EP): DR > 85% sustained ≥ `lysisDelayMs`; delay = N_pulses × (t_p / dc)
- Do not conflate lysis field with DEP crossover — they are independent phenomena

### Dielectrophoresis (DEP) and Crossover Frequency
```
f_DEP_cross ≈ fc    ← approximate crossover; exact value depends on medium vs cytoplasm ε and σ
```

- DEP mode in the chart shows force direction, not Vm — do not mix axes
- Bacteria and viruses: Schwan model is approximate; rigid-shell assumption fails for soft membranes
- Bacteria Q factor: peptidoglycan viscoelastic damping → Q ≈ 3–4 (not 10–15)

### Biomodulation Scoring (SI / MTE / MA)
```
SI  = Stimulation Index      ← sub-electroporation Vm relative to nourishing threshold
MTE = Mechano-Transduction Efficiency  ← acoustic coupling at sub-lytic amplitude
MA  = Mild Thermal Activation          ← temperature in 37–41 °C nourishing window
biomodScore = weighted combination of SI, MTE, MA (0–1)
```

- Biomodulation is only meaningful at DR < 50%; above that, EP dominates
- `biomodScore ≥ 0.55` is the "nourishing" threshold for the animated glow and score colour

### Model Caveats to Always Preserve
- Mammalian cells have **no rigid-shell acoustic resonance** — Schwan Vm rolls off via `ωτ ≫ 1`, not resonance
- Virus/bacteria Schwan Vm is an approximation; fc in GHz range is physically inaccessible with current hardware
- SAR heating model assumes uniform field and neglects blood perfusion — valid for in-vitro approximation only
