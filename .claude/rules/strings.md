# User-Visible Strings

## Brand Identity — Logo Tagline

The ResoPulse logo tagline is always **"Electroporation Digital Twin"** — never "Virtual Cell Lab" or any other variant. Lives in `locales/nav.en.json` as `nav.researchPlatform`; always reference via `$t('nav.researchPlatform')`.

Styling: `text-transform: capitalize` (never `uppercase`), `font-family: var(--font-mono)`, `font-size: 0.6rem`, `letter-spacing: 0.02em`.

## Punctuation Style

Do not use em dashes (—) or en dashes (–) in user-visible text: locale strings, tooltips, descriptions, notes, comments rendered to the UI. Use commas, colons, parentheses, or rephrase.

**Exception:** a lone `—` as a "no value" placeholder in table cells (e.g. resonance frequency for mammalian cells, DEP crossover out of range) is a scientific table convention and is allowed.

## No Hardcoded Text or Units

Every user-visible string comes from:
- `locales/*.en.json` (via `$t('key')`) — UI labels, tooltips, descriptions
- `constants/strings.ts` — domain constants (`CELL_LABEL`, `CELL_STATE`, `CHART_MODE`, `WAVEFORM`, `LOG_EVENT`)
- `constants/icons.ts` — `ICON.*`
- `constants/units.ts` — `UNIT.*`

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

**Cell role labels** (`'H'` / `'T'`): always `CELL_LABEL.HEALTHY` / `CELL_LABEL.TARGET` from `constants/strings.ts`.

### Locale file structure — one namespace per domain file

Every top-level namespace lives in exactly one file. Add new keys to the file that owns that domain; never create a catch-all file.

| File | Namespaces | Feature area |
|---|---|---|
| `locales/nav.en.json` | `nav` | NavBar, contact modal, guest session, theme toggle |
| `locales/auth.en.json` | `termsGate`, `signIn`, `signUp`, `onboarding` | Auth flow, lab entry gate |
| `locales/account.en.json` | `account` | Account settings |
| `locales/billing.en.json` | `tokens`, `upgrade`, `pricing` | Token balance, upgrade modal, pricing |
| `locales/cells.en.json` | `cells`, `lmb`, `cellHeader`, `labels`, `biostim` | Cell card, compact strip, states |
| `locales/slider.en.json` | `slider` | Field control panel |
| `locales/experiment.en.json` | `exp`, `live`, `guide`, `drChart`, `litStrip` | Experiment lab workspace |
| `locales/savedExperiments.en.json` | `experiments` | Saved experiments |
| `locales/ai.en.json` | `ai` | AI protocol optimizer |
| `locales/resonance.en.json` | `resonance` | Acoustic resonance |
| `locales/chart.en.json` | `chart` | Schwan frequency response chart |
| `locales/heatmap.en.json` | `heatmap` | Heatmap / lysis canvas |
| `locales/sweep.en.json` | `sweep` | Selectivity sweep panel |
| `locales/selectivity.en.json` | `selectivity` | Selectivity panel, DEP, comparison table |
| `locales/population.en.json` | `population` | Population distribution |
| `locales/log.en.json` | `log` | Experiment log table |
| `locales/instrument.en.json` | `instrument` | Instrument panel |
| `locales/protocol.en.json` | `header`, `feedback`, `toc`, `validation`, `validateAside`, `overview`, `physics`, `followInLab`, `protocol`, `safety`, `refs` | Protocol documentation |
| `locales/reports.en.json` | `reports` | Reports view |
| `locales/datasets.en.json` | `datasets` | Data sets view |
| `locales/home.en.json` | `home` | Home / landing |
| `locales/userPresets.en.json` | `userPresets` | User-created presets |
| `locales/validate.en.json` | `validate` | Validation workflow modal |

When adding a new domain, create `<domain>.en.json` and register it in `plugins/i18n.ts` with a spread (`...import`). `protocol` uses a nested spread and must remain as-is. Update this table after creating a file.

### Tooltip strings — forbidden patterns

Never write tooltip text inline in a template or as raw strings in a computed.

```ts
// ✗ inline hardcoded
v-tip="'<strong>Cell Parameters</strong>\nEdit biophysical properties...'"

// ✗ raw template literal in computed
tipVm(): string { return `<strong>Transmembrane Potential</strong>\nCurrent: ${this.vmDisplay}…` }

// ✓ static → locale key
v-tip="$t('cellCard.tipParamsToggle')"

// ✓ dynamic (physics values) → utility function
tipVm(): string { return tipVmFn({ vmDisplay: this.vmDisplay, disruptionRatio: this.disruptionRatio }) }
```

Dynamic tooltip builders live in `utils/<domain>Tooltips.ts` (`cellCardTooltips.ts`, `sliderTooltips.ts`, `selectivityTooltips.ts`). Static text lives in `locales/`.
