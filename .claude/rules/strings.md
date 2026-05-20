# User-Visible Strings

## Brand Identity — Logo Tagline

The SimBiotix logo tagline is always **"Electroporation Digital Twin"** — never "Virtual Cell Lab" or any other variant. Lives in `locales/nav.en.json` as `nav.researchPlatform`; always reference via `$t('nav.researchPlatform')`.

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

The EP-era locale files were deleted during the bioproduction pivot once their components were removed (2026-05-20). The live set:

#### Live locale files

| File | Namespaces | Feature area |
|---|---|---|
| `locales/campaign.en.json` | `campaign` | Campaigns view, campaign card, wizard, switcher |
| `locales/cellEngineering.en.json` | `cellEng` | Module 1 — cell line selector, genetic strategy, transfection optimizer, developability score |
| `locales/nav.en.json` | `nav` | AppShell sidebar groups (Workspaces / Knowledge / Setup), marketing NavBar, contact modal, brand tagline |
| `locales/auth.en.json` | `termsGate`, `signIn`, `signUp`, `onboarding` | Auth flow; onboarding (molecule-type + challenge picker) |
| `locales/account.en.json` | `account` | Account settings |
| `locales/home.en.json` | `home` | Home / landing — bioproduction positioning, module cards, pain-point strip |
| `locales/ai.en.json` | `ai` | AI engine + CalibrationBadge |
| `locales/log.en.json` | `log` | Log/outcome table (ReportsView, future Lab Runs) |
| `locales/reports.en.json` | `reports` | Reports view |

#### Locale files to create in later phases

| File | Namespace | Phase |
|---|---|---|
| `locales/downstream.en.json` | `downstream` | Phase 2 — Module 3 (step sequencer, yield waterfall, bottleneck) |
| `locales/library.en.json` | `library` | Phase 3 — Reference Library |
| `locales/methods.en.json` | `methods` | Phase 4 — Methods Library |
| `locales/modelDocs.en.json` | `modelDocs` | Phase 4 — Model Documentation |
| `locales/labRuns.en.json` | `labRuns` | Phase 5 — Lab Runs |
| `locales/instrumentHub.en.json` | `instrumentHub` | Phase 7 — Instrument Hub |

When adding a new domain, create `<domain>.en.json` and register it in `plugins/i18n.ts` with a spread (`...import`). Update this table after creating a file.

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
