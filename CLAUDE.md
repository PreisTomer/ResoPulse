# ResoPulse — Claude Code Instructions

These rules apply to **every code change** in this project. They are not suggestions.

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

- Vendor-prefixed properties must always be paired with the standard property:
  ```scss
  -moz-appearance: none;
  appearance: none;
  ```

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
