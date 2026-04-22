# Correctness Across Change

## Selection-Conditional Correctness — Non-Negotiable

Every physics computation and display value must produce the correct result for **every combination of user-selectable parameters**. Ask: *"Is this still correct when the scientist changes X?"*

### Two-path principle

A change is only correct if it is correct on **every branch**:

| User selection | Physics path | Must handle separately |
|---|---|---|
| Cell category (mammalian / bacteria / virus) | Schwan EP vs acoustic resonance | Never apply EP-specific factors (e.g. H-FIRE multiplier) to the resonance path |
| Waveform (CW / Pulsed / H-FIRE) | CW: PEF=1, WF=0.5 / Pulsed: PEF from RC / H-FIRE: PEF=1, WF=1.0, threshold×1.75 | H-FIRE multiplier applies only to EP membrane-charging |
| Chart mode (Schwan / Resonance) | `computeSchwan()` vs `computeResonantDisruption()` | Mode switch disables nuclear model and changes frequency range |
| Medium | σ_e changes τ, fc, SAR α, all downstream TI/DR | Recompute via `effectiveSigmaE`; never hardcode saline σ_e in live paths |
| Orientation θ | cosθ scales Vm and lysis field; θ=90° → Vm=0 | Guard divide-by-zero; SAR must NOT depend on θ |
| Double-shell enabled | Nuclear Vm needs `nuclearRadius` | Gate nuclear DR displays on both `doubleShellEnabled` and cell category |

### Checklist

1. **Identify every branch** affected by the change
2. **Verify each branch independently** — symmetry is not a given
3. **Check all consumers** — `SweepPanel`, `HeatmapCanvas`, `FrequencyResponseChart`, `socket.ts`, `ComparisonTable` often duplicate logic and can diverge
4. **Never remove a factor unconditionally** — wrap in a condition rather than deleting globally

## Cross-Cutting Impact Checklist

Changes rarely live in a single file. Ask: *"What else knows about this?"*

| Surface | What to check |
|---|---|
| `views/ProtocolView.vue` | Formulas, step descriptions, literature refs, warn-boxes |
| `utils/cellAnimation.ts` | Does the new state/parameter need a visual representation? |
| `services/socket.ts` + `apps/api/src/socket.ts` | Socket packet fields synchronised on both sides. Wire types live in `packages/shared-types`, imported as `@resopulse/shared-types` |
| `stores/experimentStore.ts` + `components/ExperimentLog.vue` | CSV columns and log table labels/order/units match the display |
| `views/ReportsView.vue` | Summary stats and full log table mirror the log |
| `views/DataSetsView.vue` | Cell library, media, therapeutic window values and notes |
| `components/SelectivityPanel/` | Warnings, badges, comparison table reflect new thresholds |
| `components/FrequencyResponseChart/` | Axes, legend, overlay lines for new computed quantities |
| `locales/*.en.json` | Every new label/tooltip/description has a key in the correct domain file |
| `constants/` | Remove unreferenced constants; add new ones in the correct file |
| `types/` | Types and unions that model the new behaviour |
| `**/*.test.ts` next to changed files | New branch covered; fixtures updated for renamed fields; assertions match new output |

**Tree-shaking:** after any removal, grep for all references before deleting. Leave no dead code.
