<script lang="ts">
import { defineComponent, computed } from 'vue'
import { CELL_PRESETS, GROUP_COLORS, GROUP_LABELS, type CellGroup, type CellPreset } from '../constants/cellLibrary'
import { MEDIA } from '../mockData'
import { membraneCm, computeFc } from '../utils/physics'

const SIGMA_SALINE = MEDIA.saline.conductivity // 1.5 S/m

const GROUPS: CellGroup[] = ['reference', 'cancer', 'bacteria', 'virus']

type ResonantPreset = CellPreset & { resonantFreqGHz?: number; capsidQ?: number; resonantThresholdVcm?: number }

export default defineComponent({
  setup() {
    // Augment each preset with computed Cm, fc in saline, and resonance params
    const presets = computed(() =>
      CELL_PRESETS.map((p) => {
        const pr = p as ResonantPreset
        const cm = membraneCm(p) * 1e3               // F/m² → mF/m²
        const fc = computeFc(p, SIGMA_SALINE)         // kHz
        const fcDisplay =
          fc >= 1000
            ? `${(fc / 1000).toFixed(2)} MHz`
            : `${fc.toFixed(1)} kHz`
        // Resonance parameters (bacteria/virus only)
        const resFreqDisplay = pr.resonantFreqGHz
          ? `${pr.resonantFreqGHz} GHz`
          : '—'
        const resQDisplay = pr.capsidQ ? `${pr.capsidQ}` : '—'
        const resEthrDisplay = pr.resonantThresholdVcm
          ? `${pr.resonantThresholdVcm}`
          : '—'
        return {
          ...p,
          cmDisplay: cm.toFixed(2),
          fcDisplay,
          resFreqDisplay,
          resQDisplay,
          resEthrDisplay,
          hasResonance: !!pr.resonantFreqGHz,
          color: GROUP_COLORS[p.group],
          groupLabel: GROUP_LABELS[p.group],
        }
      })
    )

    const mediaEntries = Object.entries(MEDIA).map(([key, val]) => ({
      key,
      name: val.name,
      conductivity: val.conductivity,
    }))

    return { presets, mediaEntries, GROUPS, GROUP_COLORS, GROUP_LABELS }
  },
})
</script>

<template>
  <div class="datasets-page">
    <div class="datasets-inner">

      <!-- Page header -->
      <div class="page-header">
        <div class="page-eyebrow">
          <span class="eyebrow-dot"></span>
          Reference Database
        </div>
        <h1 class="page-title">Cell &amp; Pathogen Data Sets</h1>
        <p class="page-subtitle">
          Biophysical parameters for all presets · Schwan single-shell model · acoustic resonance (bacteria/virus)
          <br>Computed in physiological saline (σ<sub>e</sub> = 1.5 S/m)
        </p>
      </div>

      <!-- Group legend -->
      <div class="legend-row">
        <div
          v-for="g in GROUPS"
          :key="g"
          class="legend-item"
          :style="{ '--g-color': GROUP_COLORS[g] }"
        >
          <span class="legend-dot"></span>
          {{ GROUP_LABELS[g] }}
        </div>
      </div>

      <!-- Cell library table -->
      <section class="ds-card">
        <div class="card-hdr">
          <h2 class="card-title">Cell Library</h2>
          <span class="card-tag">{{ presets.length }} presets</span>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Group</th>
                <th>Cell / Pathogen</th>
                <th>R (µm)</th>
                <th>d (nm)</th>
                <th>ε<sub>r</sub></th>
                <th>σ<sub>i</sub> (S/m)</th>
                <th>C<sub>m</sub> (mF/m²)</th>
                <th>f<sub>c</sub> in saline</th>
                <th>V<sub>m,thr</sub> (V)</th>
                <th>ρ (kg/m³)</th>
                <th title="Acoustic resonance frequency — bacteria/virus only">f<sub>res</sub></th>
                <th title="Mechanical quality factor — sharpness of resonance peak">Q</th>
                <th title="Minimum field amplitude for capsid/cell-wall disruption at resonance">E<sub>thr</sub> (V/cm)</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in presets" :key="p.presetId">
                <td>
                  <span
                    class="group-badge"
                    :style="{
                      color: p.color,
                      borderColor: p.color + '55',
                      background: p.color + '11',
                    }"
                  >{{ p.groupLabel }}</span>
                </td>
                <td class="cell-name">{{ p.label }}</td>
                <td class="mono">{{ p.radius }}</td>
                <td class="mono">{{ p.membraneThickness }}</td>
                <td class="mono">{{ p.dielectricConstant.toFixed(1) }}</td>
                <td class="mono">{{ p.conductivity }}</td>
                <td class="mono primary-val">{{ p.cmDisplay }}</td>
                <td class="mono primary-val">{{ p.fcDisplay }}</td>
                <td
                  class="mono"
                  :class="p.group === 'reference' ? 'ref-val' : 'cancer-val'"
                >{{ p.thresholdVoltage.toFixed(2) }}</td>
                <td class="mono muted">{{ p.density }}</td>
                <td class="mono" :class="p.hasResonance ? 'primary-val' : 'muted'">{{ p.resFreqDisplay }}</td>
                <td class="mono" :class="p.hasResonance ? '' : 'muted'">{{ p.resQDisplay }}</td>
                <td class="mono" :class="p.hasResonance ? 'warn-val' : 'muted'">{{ p.resEthrDisplay }}</td>
                <td class="notes-cell">{{ p.notes }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="table-footer">
          C<sub>m</sub> = ε<sub>r</sub>·ε₀/d &nbsp;·&nbsp;
          f<sub>c</sub> = 1/(2πτ), τ = R·C<sub>m</sub>·(2σ<sub>e</sub>+σ<sub>i</sub>)/(2σ<sub>e</sub>·σ<sub>i</sub>) &nbsp;·&nbsp;
          Computed at σ<sub>e</sub> = 1.5 S/m (saline) · Kotnik &amp; Miklavcic (2000) &nbsp;·&nbsp;
          f<sub>res</sub> / Q / E<sub>thr</sub>: acoustic resonance parameters (bacteria/virus only) · Tsen et al. (2007); Dykeman &amp; Sankey (2008)
        </div>
      </section>

      <!-- Propagation media -->
      <section class="ds-card">
        <div class="card-hdr">
          <h2 class="card-title">Propagation Media</h2>
          <span class="card-tag">Extracellular conductivity σ<sub>e</sub> shifts τ and V<sub>m</sub></span>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Key</th>
                <th>Medium</th>
                <th>σ<sub>e</sub> (S/m)</th>
                <th>Effect on τ / f<sub>c</sub> (quasi-DC V<sub>m</sub> unchanged) — epithelial ref σ<sub>i</sub> ≈ 0.5 S/m</th>
                <th>Typical Research Use</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="mono primary-val">saline</td>
                <td>Physiological Saline (0.9% NaCl)</td>
                <td class="mono">1.500</td>
                <td>Reference baseline · τ and f<sub>c</sub> reference (V<sub>m,DC</sub> independent of medium)</td>
                <td>Standard in vitro assay medium · physiological approximation</td>
              </tr>
              <tr>
                <td class="mono">blood</td>
                <td>Whole Blood</td>
                <td class="mono">0.700</td>
                <td>τ +16% · f<sub>c</sub> −14% (epithelial σ<sub>i</sub>≈0.5; bacteria ~5%; virions ~0% — low-σ<sub>i</sub> cells barely affected) · V<sub>m,DC</sub> unchanged</td>
                <td>Haematological applications · in vivo tumour vasculature</td>
              </tr>
              <tr>
                <td class="mono">tissue</td>
                <td>Soft Tissue</td>
                <td class="mono">0.400</td>
                <td>τ +39% · f<sub>c</sub> −28% (epithelial σ<sub>i</sub>≈0.5; bacteria ~13%; virions ~0.5%) · V<sub>m,DC</sub> unchanged · increased τ shifts fc lower</td>
                <td>Solid tumour bulk / poorly-perfused tissue (note: DMEM ≈ 1.4–1.6 S/m, not used here)</td>
              </tr>
              <tr>
                <td class="mono warn-val">water</td>
                <td>Distilled Water</td>
                <td class="mono">0.001</td>
                <td>τ ~200× longer · f<sub>c</sub> to ~5 kHz (epithelial σ<sub>i</sub>≈0.5 S/m); bacteria ~50–100×; virions ~3–5× (σ<sub>i</sub>≪σ<sub>e</sub> → medium effect collapses)</td>
                <td>Electroporation buffer · academic boundary-condition reference</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="table-footer">
          τ = R·C<sub>m</sub>·(2σ<sub>e</sub>+σ<sub>i</sub>)/(2σ<sub>e</sub>·σ<sub>i</sub>) — V<sub>m,DC</sub> independent of medium ·
          τ shift magnitudes depend on σ<sub>i</sub>: large for σ<sub>i</sub> ≈ σ<sub>e</sub> (epithelial), negligible for σ<sub>i</sub> ≪ σ<sub>e</sub> (virions)
        </div>
      </section>

      <!-- Therapeutic window reference -->
      <section class="ds-card">
        <div class="card-hdr">
          <h2 class="card-title">Therapeutic Window Reference</h2>
          <span class="card-tag">Adenocarcinoma vs Hepatocyte · saline (σ<sub>e</sub> = 1.5 S/m)</span>
        </div>
        <div class="ref-grid">
          <div class="ref-block ref-block--cancer">
            <div class="ref-block-title">Target — Adenocarcinoma</div>
            <div class="ref-block-params">
              <div class="rp-row"><span>Radius R</span><span class="mono">15 µm</span></div>
              <div class="rp-row"><span>f<sub>c</sub> (saline)</span><span class="mono cancer-val">~0.49 MHz</span></div>
              <div class="rp-row"><span>V<sub>m,thr</sub></span><span class="mono">0.70 V</span></div>
              <div class="rp-row"><span>C<sub>m</sub></span><span class="mono">~15.1 mF/m²</span></div>
              <div class="rp-row"><span>Lysis threshold</span><span class="mono cancer-val">~311 V/cm</span></div>
            </div>
          </div>
          <div class="ref-block ref-block--window">
            <div class="ref-block-title">Therapeutic Window</div>
            <div class="window-stat">
              <div class="window-ratio">~1.5×</div>
              <div class="window-label">Max V<sub>m</sub> selectivity at quasi-DC (&lt;100 kHz) — driven by size ratio R<sub>T</sub>/R<sub>H</sub></div>
            </div>
            <div class="window-stat window-stat--spaced">
              <div class="window-ratio window-ratio--sm">~2.4×</div>
              <div class="window-label">Therapeutic Index TI at quasi-DC — normalised by lysis thresholds (1.1 V / 0.70 V)</div>
            </div>
            <div class="window-stat window-stat--spaced">
              <div class="window-ratio window-ratio--sm window-ratio--muted">↓ freq</div>
              <div class="window-label">Selectivity decreases above f<sub>c</sub>(T) — target rolls off before healthy cell</div>
            </div>
            <div class="window-note">
              Cancer lysis at ~311 V/cm · Healthy threshold at ~733 V/cm
            </div>
            <div class="window-range">
              Safe operating range: <span class="mono primary-val">311–733 V/cm</span>
            </div>
          </div>
          <div class="ref-block ref-block--healthy">
            <div class="ref-block-title">Reference — Hepatocyte</div>
            <div class="ref-block-params">
              <div class="rp-row"><span>Radius R</span><span class="mono">10 µm</span></div>
              <div class="rp-row"><span>f<sub>c</sub> (saline)</span><span class="mono ref-val">~1.08 MHz</span></div>
              <div class="rp-row"><span>V<sub>m,thr</sub></span><span class="mono">1.10 V</span></div>
              <div class="rp-row"><span>C<sub>m</sub></span><span class="mono">~6.3 mF/m²</span></div>
              <div class="rp-row"><span>Lysis threshold</span><span class="mono ref-val">~733 V/cm</span></div>
            </div>
          </div>
        </div>
        <div class="table-footer">
          Quasi-DC: E<sub>lysis</sub> = V<sub>m,thr</sub>/(1.5·R) ·
          f<sub>c</sub> from Kotnik &amp; Miklavcic (2000) τ formula ·
          TI = (V<sub>t</sub>/V<sub>t,thr</sub>) / (V<sub>h</sub>/V<sub>h,thr</sub>)
        </div>
      </section>

      <!-- Acoustic resonance reference -->
      <section class="ds-card">
        <div class="card-hdr">
          <h2 class="card-title">Acoustic Resonance Reference</h2>
          <span class="card-tag">Virus &amp; Bacteria · Resonance mode</span>
        </div>
        <div class="ref-grid ref-grid--res">
          <div class="ref-block ref-block--virus">
            <div class="ref-block-title">Viral Capsids (R ≈ 60 nm)</div>
            <div class="ref-block-params">
              <div class="rp-row"><span>Influenza A f<sub>res</sub></span><span class="mono primary-val">~12 GHz</span></div>
              <div class="rp-row"><span>SARS-CoV-2 f<sub>res</sub></span><span class="mono primary-val">~10 GHz</span></div>
              <div class="rp-row"><span>E<sub>thr</sub> range</span><span class="mono warn-val">800–1000 V/cm</span></div>
              <div class="rp-row"><span>Q factor</span><span class="mono">25–30</span></div>
            </div>
          </div>
          <div class="ref-block ref-block--window">
            <div class="ref-block-title">Selectivity Principle</div>
            <div class="window-stat">
              <div class="window-ratio">∞</div>
              <div class="window-label">Theoretical selectivity at f<sub>res</sub> — healthy Schwan Vm → 0 at GHz</div>
            </div>
            <div class="window-stat window-stat--spaced">
              <div class="window-ratio window-ratio--sm">Lorentzian</div>
              <div class="window-label">Disruption = (E / E<sub>thr</sub>) × L(f, f<sub>res</sub>, Q)<br>L peaks at 1.0 at f<sub>res</sub></div>
            </div>
            <div class="window-note window-note--spaced">
              Ref: Tsen et al. (2007, 2012) · Dykeman &amp; Sankey (2008)
            </div>
          </div>
          <div class="ref-block ref-block--bacteria">
            <div class="ref-block-title">Bacteria (R ≈ 0.5–1 µm)</div>
            <div class="ref-block-params">
              <div class="rp-row"><span>E. coli f<sub>res</sub></span><span class="mono primary-val">~0.5 GHz</span></div>
              <div class="rp-row"><span>MRSA f<sub>res</sub></span><span class="mono primary-val">~1.5 GHz</span></div>
              <div class="rp-row"><span>E<sub>thr</sub> range</span><span class="mono warn-val">2000–3000 V/cm</span></div>
              <div class="rp-row"><span>Q factor</span><span class="mono">12–15</span></div>
            </div>
          </div>
        </div>
        <div class="table-footer">
          f<sub>res</sub> ≈ v<sub>protein</sub>/(2R) · v<sub>wall</sub> ≈ 1000–1500 m/s (protein/peptidoglycan) ·
          Healthy mammalian cells have no rigid-shell resonance — Schwan V<sub>m</sub> rolls off via f<sub>c</sub> ≈ 1 MHz (ωτ ≫ 1), approaching zero at GHz
        </div>
      </section>

      <!-- Electrode / field geometry note -->
      <section class="ds-card ds-card--flat">
        <div class="card-hdr">
          <h2 class="card-title">Field Geometry Assumptions</h2>
        </div>
        <div class="geo-body">
          <p class="geo-text">
            The Schwan model assumes a <strong>uniform, quasi-static electric field</strong> applied
            to a suspension of non-interacting spherical cells at low volume fraction. In clinical
            TTField devices (Optune®), 4 electrode arrays generate a rotating field at 100–300 kHz
            with amplitudes of 1–3 V/cm at depth; the field map is non-uniform and computed via
            FEM models of head conductivity. The BioResonance simulator applies the uniform-field
            Schwan equation and is appropriate for well-mixed in vitro geometries (parallel-plate
            or four-electrode chambers).
          </p>
          <div class="geo-assumptions">
            <div class="geo-item">
              <span class="geo-icon">◈</span>
              <span>Spherical single-shell cell model</span>
            </div>
            <div class="geo-item">
              <span class="geo-icon">◈</span>
              <span>Uniform applied field (E constant in space)</span>
            </div>
            <div class="geo-item">
              <span class="geo-icon">◈</span>
              <span>Dilute suspension — cell-cell interactions neglected</span>
            </div>
            <div class="geo-item">
              <span class="geo-icon">◈</span>
              <span>Linear membrane response — below pore-formation threshold</span>
            </div>
            <div class="geo-item">
              <span class="geo-icon">◈</span>
              <span>Isotropic, homogeneous cytoplasm and extracellular medium</span>
            </div>
          </div>
        </div>
      </section>

      <!-- CTA -->
      <div class="open-lab">
        <RouterLink to="/experiment" class="btn-lab">
          Open Experiment Lab →
        </RouterLink>
        <span class="open-lab-note">Apply these parameters interactively in the simulation</span>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* ── Page shell ───────────────────────────────────────────────────────────── */
.datasets-page {
  flex: 1;
  overflow-y: auto;
  background-color: var(--color-bg);
}

.datasets-inner {
  max-width: 1600px;
  margin: 0 auto;
  padding: 2rem 2rem 4rem;
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}

/* ── Page header ──────────────────────────────────────────────────────────── */
.page-eyebrow {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.72rem;
  color: var(--color-primary);
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-family: var(--font-mono);
  margin-bottom: 0.75rem;
}

.eyebrow-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--color-primary);
  box-shadow: 0 0 8px var(--color-primary);
}

.page-title {
  font-size: 2rem;
  font-weight: 800;
  color: var(--color-text-heading);
  margin: 0 0 0.5rem;
}

.page-subtitle {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin: 0;
  font-family: var(--font-mono);
  line-height: 1.6;
}

/* ── Legend ───────────────────────────────────────────────────────────────── */
.legend-row {
  display: flex;
  gap: 1.25rem;
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.78rem;
  color: var(--color-text-muted);
  font-family: var(--font-mono);
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--g-color);
  box-shadow: 0 0 6px var(--g-color);
}

/* ── Card ─────────────────────────────────────────────────────────────────── */
.ds-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.ds-card--flat .geo-body {
  padding: 1.5rem;
}

.card-hdr {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.1rem 1.5rem;
  border-bottom: 1px solid var(--color-border);
  flex-wrap: wrap;
}

.card-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text-heading);
  margin: 0;
}

.card-tag {
  font-size: 0.68rem;
  font-family: var(--font-mono);
  color: var(--color-text-muted);
  background: var(--color-surface-2, #0a1628);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 0.2rem 0.55rem;
}

/* ── Data table ───────────────────────────────────────────────────────────── */
.table-wrap { overflow-x: auto; }

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
  min-width: 820px;
}

.data-table th {
  text-align: left;
  padding: 0.55rem 0.8rem;
  font-size: 0.63rem;
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-muted);
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
}

.data-table td {
  padding: 0.6rem 0.8rem;
  color: var(--color-text);
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  vertical-align: middle;
}

.data-table tr:last-child td { border-bottom: none; }
.data-table tr:hover td { background: rgba(255, 255, 255, 0.025); }

.mono        { font-family: var(--font-mono); font-size: 0.78rem; }
.primary-val { color: var(--color-primary); }
.cancer-val  { color: var(--color-danger);  }
.ref-val     { color: var(--color-primary); }
.warn-val    { color: var(--color-amber);   }
.muted       { color: var(--color-text-muted); }
.cell-name   { font-weight: 500; color: var(--color-text-heading); }
.notes-cell  { font-size: 0.71rem; color: var(--color-text-muted); min-width: 160px; }

.group-badge {
  font-size: 0.63rem;
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 0.15rem 0.5rem;
  border-radius: 3px;
  border: 1px solid;
  white-space: nowrap;
}

.table-footer {
  padding: 0.7rem 1.5rem;
  font-size: 0.66rem;
  font-family: var(--font-mono);
  color: var(--color-text-muted);
  opacity: 0.7;
  border-top: 1px solid var(--color-border);
  line-height: 1.6;
}

/* ── Therapeutic window ───────────────────────────────────────────────────── */
.ref-grid {
  display: grid;
  grid-template-columns: 1fr 1.2fr 1fr;
  gap: 0;
}

.ref-block {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.ref-block + .ref-block {
  border-left: 1px solid var(--color-border);
}

.ref-block-title {
  font-size: 0.7rem;
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--color-text-muted);
}

.ref-block--cancer .ref-block-title   { color: var(--color-danger);  }
.ref-block--healthy .ref-block-title  { color: var(--color-primary); }
.ref-block--window .ref-block-title   { color: var(--color-lime);    }
.ref-block--virus .ref-block-title    { color: var(--color-purple);  }
.ref-block--bacteria .ref-block-title { color: var(--color-amber);   }
.ref-grid--res { grid-template-columns: 1fr 1.2fr 1fr; }

.ref-block-params {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.rp-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
  color: var(--color-text-muted);
  gap: 0.5rem;
}

.window-ratio {
  font-size: 2.5rem;
  font-weight: 800;
  font-family: var(--font-mono);
  color: var(--color-lime);
  line-height: 1;
}
.window-ratio--sm    { font-size: 1.1rem; }
.window-ratio--muted { color: var(--color-text-muted); }
.window-stat--spaced { margin-top: 0.4rem; }

.window-label {
  font-size: 0.7rem;
  color: var(--color-text-muted);
  line-height: 1.4;
}

.window-note {
  font-size: 0.78rem;
  color: var(--color-text-muted);
  line-height: 1.5;
}
.window-note--spaced { margin-top: 0.6rem; }

.window-range {
  font-size: 0.78rem;
  color: var(--color-text-muted);
}

/* ── Geometry note ────────────────────────────────────────────────────────── */
.geo-text {
  font-size: 0.88rem;
  color: var(--color-text);
  line-height: 1.8;
  margin: 0 0 1.25rem;
}

.geo-text strong {
  color: var(--color-text-heading);
}

.geo-assumptions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 0.5rem;
}

.geo-item {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.geo-icon {
  color: var(--color-primary);
  flex-shrink: 0;
}

/* ── Open lab CTA ─────────────────────────────────────────────────────────── */
.open-lab {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.btn-lab {
  display: inline-flex;
  align-items: center;
  padding: 0.65rem 1.5rem;
  background-color: var(--color-primary);
  color: #060e1a;
  font-weight: 600;
  font-size: 0.9rem;
  border-radius: var(--radius);
  text-decoration: none;
  box-shadow: 0 0 20px rgba(0, 212, 255, 0.3);
  transition: all 0.18s;
}

.btn-lab:hover {
  filter: brightness(1.1);
  box-shadow: 0 0 32px rgba(0, 212, 255, 0.5);
}

.open-lab-note {
  font-size: 0.78rem;
  color: var(--color-text-muted);
  font-family: var(--font-mono);
}

/* ── Responsive ───────────────────────────────────────────────────────────── */
@media (max-width: 900px) {
  .ref-grid {
    grid-template-columns: 1fr;
  }
  .ref-block + .ref-block {
    border-left: none;
    border-top: 1px solid var(--color-border);
  }
}

@media (max-width: 600px) {
  .datasets-inner { padding: 1rem 1rem 3rem; }
}
</style>
