# TypeScript

## Patterns

- Fixed-length arrays: tuple type `[CellConfig, CellConfig]` to avoid `| undefined`
- Dynamic property access: `(cell as Record<string, number>)[key]` — single cast; never double `as unknown as`
- Timer types: `ReturnType<typeof setInterval>` / `ReturnType<typeof setTimeout>`
- Pinia getters — state only: arrow function; needs other getters: method syntax with `const state = this as CellStoreState`
- Module-level functions are not accessible in Vue templates — expose via `methods: {}` wrappers
- **`unknown` is forbidden** — never `as unknown`, `as unknown as X`, or `: unknown`. Use the narrowest correct type or a single `as X` cast
- **`object` is forbidden as a type annotation** — never `: object`, `as object`, `Promise<object>`, `Array<object>`, or any parameter/return typed as `object`. Create a named `interface` or `type` alias for the shape. The only permitted use is as a silent intermediate in `as object as TargetType` when TS rejects a direct cast — and only when a named target alias exists

## Pinia in Options API components

Always use `mapStores` — never `setup()`.

```ts
import { mapStores } from 'pinia'
import { useCellStore } from '@/stores/cellStore'
import { useExperimentStore } from '@/stores/experimentStore'

computed: {
  ...mapStores(useCellStore, useExperimentStore),
  // → this.cellStore, this.experimentStore
}
```

Store name mapping (`id` + `'Store'`):

| Call | id | `this.*` |
|---|---|---|
| `useCellStore` | `cell` | `cellStore` |
| `useExperimentStore` | `experiment` | `experimentStore` |
| `useImpedanceStore` | `impedance` | `impedanceStore` |
| `useAiStore` | `ai` | `aiStore` |
| `useUiStore` | `ui` | `uiStore` |
| `useThemeStore` | `theme` | `themeStore` |
| `useUserPresetsStore` | `userPresets` | `userPresetsStore` |
| `useTokenStore` | `token` | `tokenStore` |
| `useAuthStore` | `auth` | `authStore` |
| `useSavedExperimentsStore` | `savedExperiments` | `savedExperimentsStore` |
| `useReplayStore` | `replay` | `replayStore` |

## Global constants and utilities in templates

- **Constants** (ICON, UNIT, CELL_STATE): expose as computed getters — `ICON() { return ICON }`
- **Utility functions**: expose as methods wrappers — `formatFreqKHz(khz: number) { return formatFreqKHz(khz) }`
- Never put imported module-level values in `data()` — they are not component state

## Constants Files

| File | Contents |
|---|---|
| `constants/physics.ts` | Physics constants (ε₀, Boltzmann, thresholds, factors) |
| `constants/units.ts` | `UNIT` object — display unit strings |
| `constants/strings.ts` | `CELL_LABEL`, `CELL_STATE`, `CELL_TYPE`, `CHART_MODE`, `WAVEFORM`, `LOG_EVENT`, `PRESET_ID` |
| `constants/icons.ts` | `ICON` object — unicode/emoji characters |
| `constants/cellLibrary.ts` | `CellPreset` entries |
| `constants/sliderBounds.ts` | Slider min/max/step/default values |
| `constants/experimentDefaults.ts` | Category-specific default field params |
| `constants/cellCard.ts` | Cell card display config |
