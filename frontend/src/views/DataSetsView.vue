<template>
  <div class="datasets">
    <div class="datasets__inner">

      <!-- Page header -->
      <div class="datasets__header">
        <div class="datasets__eyebrow">
          <span class="datasets__eyebrow-dot"></span>
          Reference Database
        </div>
        <h1 class="datasets__title">Cell &amp; Pathogen Data Sets</h1>
        <p class="datasets__subtitle">
          Biophysical parameters for all presets · Schwan single-shell model · double-shell nuclear envelope (mammalian) · acoustic resonance (bacteria/virus)
          <br>Computed in physiological saline (σ<sub>e</sub> = 1.5 S/m) · Kotnik &amp; Miklavcic (2000, 2006)
        </p>
      </div>

      <!-- Group legend -->
      <div class="datasets__legend-row">
        <div
          v-for="g in GROUPS"
          :key="g"
          class="datasets__legend-item"
          :style="{ '--g-color': GROUP_COLORS[g] }"
        >
          <span class="datasets__legend-dot"></span>
          {{ GROUP_LABELS[g] }}
        </div>
      </div>

      <!-- Cell library table -->
      <section class="datasets__card">
        <div class="datasets__card-hdr">
          <h2 class="datasets__card-title">Cell Library</h2>
          <span class="datasets__card-tag">{{ presets.length }} presets</span>
        </div>
        <div class="datasets__table-wrap">
          <table class="datasets__table">
            <thead>
              <tr>
                <th>Group</th>
                <th>Cell / Pathogen</th>
                <th>R (µm)</th>
                <th>d (nm)</th>
                <th title="Effective membrane relative permittivity. Physical lipid bilayer ε_r ≈ 2–5; protein channels and pore contributions raise the effective value. Used in Cm = ε_r·ε₀/d.">Eff. ε<sub>r</sub></th>
                <th>σ<sub>i</sub> (S/m)</th>
                <th>C<sub>m</sub> (mF/m²)</th>
                <th>f<sub>c</sub> in saline</th>
                <th>V<sub>m,thr</sub> (V)</th>
                <th title="Nuclear radius — double-shell model (mammalian nucleated cells only; RBC and bacteria/virus have no nucleus)">R<sub>nuc</sub> (µm)</th>
                <th>ρ (kg/m³)</th>
                <th title="Acoustic resonance frequency — bacteria/virus only">f<sub>res</sub></th>
                <th title="Mechanical quality factor — sharpness of resonance peak">Q</th>
                <th title="Theoretical RF field amplitude for capsid/cell-wall disruption at resonance. Tsen et al. experiments used femtosecond laser excitation, not RF; these V/cm values are extrapolations with no direct experimental basis.">E<sub>thr</sub>† (V/cm)</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in presets" :key="p.presetId">
                <td>
                  <span
                    class="datasets__group-badge"
                    :style="{
                      color: p.color,
                      borderColor: p.color + '55',
                      background: p.color + '11',
                    }"
                  >{{ p.groupLabel }}</span>
                </td>
                <td class="datasets__cell-name">{{ p.label }}</td>
                <td class="datasets__mono">{{ p.radius }}</td>
                <td class="datasets__mono">{{ p.membraneThickness }}</td>
                <td class="datasets__mono">{{ p.dielectricConstant.toFixed(1) }}</td>
                <td class="datasets__mono">{{ p.conductivity }}</td>
                <td class="datasets__mono datasets__primary-val">{{ p.cmDisplay }}</td>
                <td class="datasets__mono datasets__primary-val">{{ p.fcDisplay }}</td>
                <td
                  class="datasets__mono"
                  :class="p.group === CELL_GROUP.REFERENCE ? 'datasets__ref-val' : 'datasets__cancer-val'"
                >{{ p.thresholdVoltage.toFixed(2) }}</td>
                <td class="datasets__mono" :class="p.hasNuclear ? 'datasets__nuc-val' : 'datasets__muted'">{{ p.nucRDisplay }}</td>
                <td class="datasets__mono datasets__muted">{{ p.density }}</td>
                <td class="datasets__mono" :class="p.hasResonance ? 'datasets__primary-val' : 'datasets__muted'">{{ p.resFreqDisplay }}</td>
                <td class="datasets__mono" :class="p.hasResonance ? '' : 'datasets__muted'">{{ p.resQDisplay }}</td>
                <td class="datasets__mono" :class="p.hasResonance ? 'datasets__warn-val' : 'datasets__muted'">{{ p.resEthrDisplay }}</td>
                <td class="datasets__notes-cell">{{ p.notes }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="datasets__table-footer">
          C<sub>m</sub> = ε<sub>r</sub>·ε₀/d &nbsp;·&nbsp;
          f<sub>c</sub> = 1/(2πτ), τ = R·C<sub>m</sub>·(2σ<sub>e</sub>+σ<sub>i</sub>)/(2σ<sub>e</sub>·σ<sub>i</sub>) &nbsp;·&nbsp;
          Computed at σ<sub>e</sub> = 1.5 S/m (saline) · Kotnik &amp; Miklavcic (2000) &nbsp;·&nbsp;
          f<sub>res</sub> / Q / E<sub>thr</sub>: acoustic resonance parameters (bacteria/virus only) · Tsen et al. (2007); Dykeman &amp; Sankey (2008)
        </div>
      </section>

      <!-- Propagation media -->
      <section class="datasets__card">
        <div class="datasets__card-hdr">
          <h2 class="datasets__card-title">Propagation Media</h2>
          <span class="datasets__card-tag">Extracellular conductivity σ<sub>e</sub> shifts τ and V<sub>m</sub></span>
        </div>
        <div class="datasets__table-wrap">
          <table class="datasets__table">
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
                <td class="datasets__mono datasets__primary-val">saline</td>
                <td>Physiological Saline (0.9% NaCl)</td>
                <td class="datasets__mono">1.500</td>
                <td>Reference baseline · τ and f<sub>c</sub> reference (V<sub>m,DC</sub> independent of medium)</td>
                <td>Standard in vitro assay medium · physiological approximation</td>
              </tr>
              <tr>
                <td class="datasets__mono">blood</td>
                <td>Whole Blood</td>
                <td class="datasets__mono">0.700</td>
                <td>τ +16% · f<sub>c</sub> −14% (epithelial σ<sub>i</sub>≈0.5; bacteria ~5%; virions ~0% — low-σ<sub>i</sub> cells barely affected) · V<sub>m,DC</sub> unchanged</td>
                <td>Haematological applications · in vivo tumour vasculature</td>
              </tr>
              <tr>
                <td class="datasets__mono">tissue</td>
                <td>Soft Tissue</td>
                <td class="datasets__mono">0.400</td>
                <td>τ +39% · f<sub>c</sub> −28% (epithelial σ<sub>i</sub>≈0.5; bacteria ~13%; virions ~0.5%) · V<sub>m,DC</sub> unchanged · increased τ shifts fc lower</td>
                <td>Solid tumour bulk / poorly-perfused tissue (note: DMEM ≈ 1.4–1.6 S/m, not used here)</td>
              </tr>
              <tr>
                <td class="datasets__mono datasets__warn-val">water</td>
                <td>Distilled Water</td>
                <td class="datasets__mono">0.001</td>
                <td>τ ~200× longer · f<sub>c</sub> to ~5 kHz (epithelial σ<sub>i</sub>≈0.5 S/m); bacteria ~50–100×; virions ~3–5× (σ<sub>i</sub>≪σ<sub>e</sub> → medium effect collapses)</td>
                <td>Electroporation buffer · academic boundary-condition reference</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="datasets__table-footer">
          τ = R·C<sub>m</sub>·(2σ<sub>e</sub>+σ<sub>i</sub>)/(2σ<sub>e</sub>·σ<sub>i</sub>) — V<sub>m,DC</sub> independent of medium ·
          τ shift magnitudes depend on σ<sub>i</sub>: large for σ<sub>i</sub> ≈ σ<sub>e</sub> (epithelial), negligible for σ<sub>i</sub> ≪ σ<sub>e</sub> (virions)
        </div>
      </section>

      <!-- Therapeutic window reference -->
      <section class="datasets__card">
        <div class="datasets__card-hdr">
          <h2 class="datasets__card-title">Therapeutic Window Reference</h2>
          <span class="datasets__card-tag">Adenocarcinoma vs Hepatocyte · saline (σ<sub>e</sub> = 1.5 S/m)</span>
        </div>
        <div class="datasets__ref-grid">
          <div class="datasets__ref-block datasets__ref-block--cancer">
            <div class="datasets__ref-block-title">Target — Adenocarcinoma</div>
            <div class="datasets__ref-block-params">
              <div class="datasets__rp-row"><span>Radius R</span><span class="datasets__mono">15 µm</span></div>
              <div class="datasets__rp-row"><span>f<sub>c</sub> (saline)</span><span class="datasets__mono datasets__cancer-val">~0.49 MHz</span></div>
              <div class="datasets__rp-row"><span>V<sub>m,thr</sub></span><span class="datasets__mono">0.70 V</span></div>
              <div class="datasets__rp-row"><span>C<sub>m</sub></span><span class="datasets__mono">~15.1 mF/m²</span></div>
              <div class="datasets__rp-row"><span>Lysis threshold</span><span class="datasets__mono datasets__cancer-val">~311 V/cm</span></div>
            </div>
          </div>
          <div class="datasets__ref-block datasets__ref-block--window">
            <div class="datasets__ref-block-title">Therapeutic Window</div>
            <div class="datasets__window-stat">
              <div class="datasets__window-ratio">~1.5×</div>
              <div class="datasets__window-label">Max V<sub>m</sub> selectivity at quasi-DC (&lt;100 kHz) — driven by size ratio R<sub>T</sub>/R<sub>H</sub></div>
            </div>
            <div class="datasets__window-stat datasets__window-stat--spaced">
              <div class="datasets__window-ratio datasets__window-ratio--sm">~2.4×</div>
              <div class="datasets__window-label">Therapeutic Index TI at quasi-DC — normalised by lysis thresholds (1.1 V / 0.70 V)</div>
            </div>
            <div class="datasets__window-stat datasets__window-stat--spaced">
              <div class="datasets__window-ratio datasets__window-ratio--sm datasets__window-ratio--muted">↓ freq</div>
              <div class="datasets__window-label">Selectivity decreases above f<sub>c</sub>(T) — target rolls off before healthy cell</div>
            </div>
            <div class="datasets__window-note">
              Cancer lysis at ~311 V/cm · Healthy threshold at ~733 V/cm
            </div>
            <div class="datasets__window-range">
              Safe operating range: <span class="datasets__mono datasets__primary-val">311–733 V/cm</span>
            </div>
          </div>
          <div class="datasets__ref-block datasets__ref-block--healthy">
            <div class="datasets__ref-block-title">Reference — Hepatocyte</div>
            <div class="datasets__ref-block-params">
              <div class="datasets__rp-row"><span>Radius R</span><span class="datasets__mono">10 µm</span></div>
              <div class="datasets__rp-row"><span>f<sub>c</sub> (saline)</span><span class="datasets__mono datasets__ref-val">~1.08 MHz</span></div>
              <div class="datasets__rp-row"><span>V<sub>m,thr</sub></span><span class="datasets__mono">1.10 V</span></div>
              <div class="datasets__rp-row"><span>C<sub>m</sub></span><span class="datasets__mono">~6.3 mF/m²</span></div>
              <div class="datasets__rp-row"><span>Lysis threshold</span><span class="datasets__mono datasets__ref-val">~733 V/cm</span></div>
            </div>
          </div>
        </div>
        <div class="datasets__table-footer">
          Quasi-DC: E<sub>lysis</sub> = V<sub>m,thr</sub>/(1.5·R) ·
          f<sub>c</sub> from Kotnik &amp; Miklavcic (2000) τ formula ·
          TI = (V<sub>t</sub>/V<sub>t,thr</sub>) / (V<sub>h</sub>/V<sub>h,thr</sub>)
        </div>
      </section>

      <!-- Double-shell nuclear envelope parameters -->
      <section class="datasets__card">
        <div class="datasets__card-hdr">
          <h2 class="datasets__card-title">Double-Shell Nuclear Envelope Parameters</h2>
          <span class="datasets__card-tag">Mammalian nucleated cells only · Kotnik &amp; Miklavcic (2006)</span>
        </div>
        <div class="datasets__table-wrap">
          <table class="datasets__table">
            <thead>
              <tr>
                <th>Cell</th>
                <th title="Nuclear radius — typically 40–60% of cell radius for mammalian cells">R<sub>nuc</sub> (µm)</th>
                <th title="Nuclear envelope thickness (inner + outer membrane + lumen ≈ 40 nm total; d here is electrical effective thickness)">d<sub>ne</sub> (nm)</th>
                <th title="Relative permittivity of nuclear envelope — elevated vs lipid bilayer due to nuclear pore complex contribution">ε<sub>ne</sub></th>
                <th title="Nucleoplasm conductivity — typically higher than cytoplasm due to dissolved chromatin and RNA">σ<sub>np</sub> (S/m)</th>
                <th title="Nuclear membrane disruption threshold voltage — cancer nuclei have thinner/leakier NE, lower threshold">V<sub>thr,nuc</sub> (V)</th>
                <th title="Peak frequency of nuclear Vm bandpass: f_peak = 1 / (2π × √(τ_out × τ_ne)) — nuclear Vm is maximised here, not at DC">f<sub>peak</sub> in saline</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in nuclearPresets" :key="p.presetId">
                <td class="datasets__cell-name">
                  <span
                    class="datasets__group-badge"
                    :style="{ color: p.color, borderColor: p.color + '55', background: p.color + '11' }"
                  >{{ p.groupLabel }}</span>
                  {{ p.label }}
                </td>
                <td class="datasets__mono datasets__nuc-val">{{ p.nuclearRadius }}</td>
                <td class="datasets__mono">{{ p.nuclearMembraneThickness ?? 15 }}</td>
                <td class="datasets__mono">{{ p.nuclearMembraneEps ?? 10 }}</td>
                <td class="datasets__mono">{{ p.nucleoplasmConductivity ?? 0.9 }}</td>
                <td
                  class="datasets__mono"
                  :class="p.group === CELL_GROUP.REFERENCE ? 'datasets__ref-val' : 'datasets__cancer-val'"
                >{{ p.nuclearThresholdVoltage ?? 0.50 }}</td>
                <td class="datasets__mono datasets__nuc-val">{{ p.nucFpeakDisplay }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="datasets__table-footer">
          τ<sub>ne</sub> = R<sub>nuc</sub>·C<sub>m,ne</sub>·(2σ<sub>i</sub>+σ<sub>np</sub>)/(2σ<sub>i</sub>·σ<sub>np</sub>)  ·  C<sub>m,ne</sub> = ε<sub>ne</sub>·ε₀/d<sub>ne</sub>  ·
          f<sub>peak</sub> = 1/(2π√(τ<sub>out</sub>·τ<sub>ne</sub>))  ·  Nuclear Vm is bandpass — zero at DC &amp; GHz, peaks near f<sub>peak</sub>  ·
          Cancer nuclei: higher N/C ratio, thinner NE, lower V<sub>thr,nuc</sub> → additional selectivity axis at f<sub>peak</sub>  ·  σ<sub>ne</sub> not stored (capacitive limit σ<sub>ne</sub>→0 assumed)
        </div>
      </section>

      <!-- Acoustic resonance reference -->
      <section class="datasets__card">
        <div class="datasets__card-hdr">
          <h2 class="datasets__card-title">Acoustic Resonance Reference</h2>
          <span class="datasets__card-tag">Virus &amp; Bacteria · Resonance mode</span>
        </div>
        <div class="datasets__ref-grid datasets__ref-grid--res">
          <div class="datasets__ref-block datasets__ref-block--virus">
            <div class="datasets__ref-block-title">Viral Capsids (R ≈ 60 nm)</div>
            <div class="datasets__ref-block-params">
              <div class="datasets__rp-row"><span>Influenza A f<sub>res</sub></span><span class="datasets__mono datasets__primary-val">~12 GHz</span></div>
              <div class="datasets__rp-row"><span>SARS-CoV-2 f<sub>res</sub></span><span class="datasets__mono datasets__primary-val">~10 GHz</span></div>
              <div class="datasets__rp-row"><span>E<sub>thr</sub> range</span><span class="datasets__mono datasets__warn-val">800–1000 V/cm</span></div>
              <div class="datasets__rp-row"><span>Q factor</span><span class="datasets__mono">25–30</span></div>
            </div>
          </div>
          <div class="datasets__ref-block datasets__ref-block--window">
            <div class="datasets__ref-block-title">Selectivity Principle</div>
            <div class="datasets__window-stat">
              <div class="datasets__window-ratio">∞</div>
              <div class="datasets__window-label">Theoretical selectivity at f<sub>res</sub> — healthy Schwan Vm → 0 at GHz</div>
            </div>
            <div class="datasets__window-stat datasets__window-stat--spaced">
              <div class="datasets__window-ratio datasets__window-ratio--sm">Lorentzian</div>
              <div class="datasets__window-label">Disruption = (E / E<sub>thr</sub>) × L(f, f<sub>res</sub>, Q)<br>L peaks at 1.0 at f<sub>res</sub></div>
            </div>
            <div class="datasets__window-note datasets__window-note--spaced">
              Ref: Tsen et al. (2007, 2012) · Dykeman &amp; Sankey (2008)
            </div>
          </div>
          <div class="datasets__ref-block datasets__ref-block--bacteria">
            <div class="datasets__ref-block-title">Bacteria (R ≈ 0.5–1 µm)</div>
            <div class="datasets__ref-block-params">
              <div class="datasets__rp-row"><span>E. coli f<sub>res</sub></span><span class="datasets__mono datasets__primary-val">~0.5 GHz</span></div>
              <div class="datasets__rp-row"><span>MRSA f<sub>res</sub></span><span class="datasets__mono datasets__primary-val">~1.5 GHz</span></div>
              <div class="datasets__rp-row"><span>E<sub>thr</sub> range</span><span class="datasets__mono datasets__warn-val">2000–3000 V/cm</span></div>
              <div class="datasets__rp-row"><span>Q factor</span><span class="datasets__mono">12–15</span></div>
            </div>
          </div>
        </div>
        <div class="datasets__table-footer">
          f<sub>res</sub> ≈ v<sub>protein</sub>/(2R) · v<sub>wall</sub> ≈ 1000–1500 m/s (protein/peptidoglycan) ·
          Healthy mammalian cells have no rigid-shell resonance — Schwan V<sub>m</sub> rolls off via f<sub>c</sub> ≈ 1 MHz (ωτ ≫ 1), approaching zero at GHz
        </div>
      </section>

      <!-- Electrode / field geometry note -->
      <section class="datasets__card datasets__card--flat">
        <div class="datasets__card-hdr">
          <h2 class="datasets__card-title">Field Geometry Assumptions</h2>
        </div>
        <div class="datasets__geo-body">
          <p class="datasets__geo-text">
            The Schwan model assumes a <strong>uniform, quasi-static electric field</strong> applied
            to a suspension of non-interacting spherical cells at low volume fraction. In clinical
            TTField devices (Optune®), 4 electrode arrays generate a rotating field at 100–300 kHz
            with amplitudes of 1–3 V/cm at depth; the field map is non-uniform and computed via
            FEM models of head conductivity. The BioResonance simulator applies the uniform-field
            Schwan equation and is appropriate for well-mixed in vitro geometries (parallel-plate
            or four-electrode chambers).
          </p>
          <div class="datasets__geo-assumptions">
            <div class="datasets__geo-item">
              <span class="datasets__geo-icon">◈</span>
              <span>Single-shell (Schwan) or double-shell (nuclear envelope) cell model</span>
            </div>
            <div class="datasets__geo-item">
              <span class="datasets__geo-icon">◈</span>
              <span>Uniform applied field (E constant in space)</span>
            </div>
            <div class="datasets__geo-item">
              <span class="datasets__geo-icon">◈</span>
              <span>Dilute suspension — cell-cell interactions neglected</span>
            </div>
            <div class="datasets__geo-item">
              <span class="datasets__geo-icon">◈</span>
              <span>Linear membrane response — below pore-formation threshold</span>
            </div>
            <div class="datasets__geo-item">
              <span class="datasets__geo-icon">◈</span>
              <span>Isotropic, homogeneous cytoplasm and extracellular medium</span>
            </div>
          </div>
        </div>
      </section>

      <!-- CTA -->
      <div class="datasets__open-lab">
        <RouterLink to="/experiment" class="datasets__btn-lab">
          Open Experiment Lab →
        </RouterLink>
        <span class="datasets__open-lab-note">Apply these parameters interactively in the simulation</span>
      </div>

    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import { CELL_PRESETS, GROUP_COLORS, GROUP_LABELS, type CellGroup, type CellPreset } from '@/constants/cellLibrary'
import { MEDIA } from '@/constants/media'
import { CELL_GROUP } from '@/constants/strings'
import { membraneCm, computeFc, computeTau, computeNuclearTau } from '@/utils/physics'

const SIGMA_SALINE = MEDIA.saline.conductivity // 1.5 S/m

const GROUPS: CellGroup[] = [CELL_GROUP.REFERENCE, CELL_GROUP.CANCER, CELL_GROUP.BACTERIA, CELL_GROUP.VIRUS] as CellGroup[]

type ResonantPreset = CellPreset & {
  resonantFreqGHz?: number
  capsidQ?: number
  resonantThresholdVcm?: number
  nuclearRadius?: number
  nuclearMembraneThickness?: number
  nuclearMembraneEps?: number
  nucleoplasmConductivity?: number
  nuclearThresholdVoltage?: number
}

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
        // Nuclear envelope parameters (mammalian nucleated cells)
        const hasNuclear = !!pr.nuclearRadius
        const nucRDisplay = pr.nuclearRadius ? `${pr.nuclearRadius}` : '—'
        // f_peak for nuclear section: 1 / (2π × √(τ_out × τ_ne))
        let nucFpeakDisplay = '—'
        if (hasNuclear) {
          const tau_out = computeTau(p, SIGMA_SALINE)
          const tau_ne  = computeNuclearTau(p, SIGMA_SALINE)
          if (tau_out > 0 && tau_ne > 0) {
            const fpeak_Hz  = 1 / (2 * Math.PI * Math.sqrt(tau_out * tau_ne))
            const fpeak_MHz = fpeak_Hz / 1e6
            nucFpeakDisplay = `${fpeak_MHz.toFixed(2)} MHz`
          }
        }
        return {
          ...p,
          cmDisplay: cm.toFixed(2),
          fcDisplay,
          resFreqDisplay,
          resQDisplay,
          resEthrDisplay,
          hasResonance: !!pr.resonantFreqGHz,
          hasNuclear,
          nucRDisplay,
          nucFpeakDisplay,
          color: GROUP_COLORS[p.group],
          groupLabel: GROUP_LABELS[p.group],
        }
      })
    )

    const nuclearPresets = computed(() => presets.value.filter(p => p.hasNuclear))

    const mediaEntries = Object.entries(MEDIA).map(([key, val]) => ({
      key,
      name: val.name,
      conductivity: val.conductivity,
    }))

    return { presets, nuclearPresets, mediaEntries, GROUPS, GROUP_COLORS, GROUP_LABELS, CELL_GROUP }
  },
})
</script>

<style lang="scss" scoped>
@use '../styles/mixins' as *;

/* ── Page shell ───────────────────────────────────────────────────────────── */
.datasets {
  flex: 1;
  overflow-y: auto;
  background-color: var(--color-bg);

  &__inner {
    max-width: 1600px;
    margin: 0 auto;
    padding: 2rem 2rem 4rem;
    @include flex-col(1.75rem);
  }

  /* ── Page header ──────────────────────────────────────────────────────────── */
  &__eyebrow {
    @include flex-row(0.5rem);
    @include mono-upper(0.72rem, 0.14em);
    color: var(--color-primary);
    margin-bottom: 0.75rem;
  }

  &__eyebrow-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: var(--color-primary);
    box-shadow: 0 0 8px var(--color-primary);
  }

  &__title {
    font-size: 2rem;
    font-weight: 800;
    color: var(--color-text-heading);
    margin: 0 0 0.5rem;
  }

  &__subtitle {
    font-size: 0.875rem;
    color: var(--color-text-muted);
    margin: 0;
    font-family: var(--font-mono);
    line-height: 1.6;
  }

  /* ── Legend ───────────────────────────────────────────────────────────────── */
  &__legend-row {
    display: flex;
    gap: 1.25rem;
    flex-wrap: wrap;
  }

  &__legend-item {
    @include flex-row(0.45rem);
    font-size: 0.78rem;
    color: var(--color-text-muted);
    font-family: var(--font-mono);
  }

  &__legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: var(--g-color);
    box-shadow: 0 0 6px var(--g-color);
  }

  /* ── Card ─────────────────────────────────────────────────────────────────── */
  &__card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    overflow: hidden;

    &--flat .datasets__geo-body {
      padding: 1.5rem;
    }
  }

  &__card-hdr {
    @include flex-row(1rem);
    padding: 1.1rem 1.5rem;
    border-bottom: 1px solid var(--color-border);
    flex-wrap: wrap;
  }

  &__card-title {
    font-size: 1rem;
    font-weight: 700;
    color: var(--color-text-heading);
    margin: 0;
  }

  &__card-tag {
    font-size: 0.68rem;
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    background: var(--color-surface-2, #0a1628);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 0.2rem 0.55rem;
  }

  /* ── Data table ───────────────────────────────────────────────────────────── */
  &__table-wrap {
    overflow-x: auto;
  }

  &__table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.8rem;
    min-width: 820px;

    th {
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

    td {
      padding: 0.6rem 0.8rem;
      color: var(--color-text);
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      vertical-align: middle;
    }

    tr:last-child td { border-bottom: none; }
    tr:hover td { background: rgba(255, 255, 255, 0.025); }
  }

  &__mono        { font-family: var(--font-mono); font-size: 0.78rem; }
  &__primary-val { color: var(--color-primary); }
  &__cancer-val  { color: var(--color-danger);  }
  &__ref-val     { color: var(--color-primary); }
  &__warn-val    { color: var(--color-amber);   }
  &__nuc-val     { color: #a78bfa; }
  &__muted       { color: var(--color-text-muted); }
  &__cell-name   { font-weight: 500; color: var(--color-text-heading); }
  &__notes-cell  { font-size: 0.71rem; color: var(--color-text-muted); min-width: 160px; }

  &__group-badge {
    font-size: 0.63rem;
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 0.15rem 0.5rem;
    border-radius: 3px;
    border: 1px solid;
    white-space: nowrap;
  }

  &__table-footer {
    padding: 0.7rem 1.5rem;
    font-size: 0.66rem;
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    opacity: 0.7;
    border-top: 1px solid var(--color-border);
    line-height: 1.6;
  }

  /* ── Therapeutic window ───────────────────────────────────────────────────── */
  &__ref-grid {
    display: grid;
    grid-template-columns: 1fr 1.2fr 1fr;
    gap: 0;

    &--res { grid-template-columns: 1fr 1.2fr 1fr; }
  }

  &__ref-block {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;

    & + & {
      border-left: 1px solid var(--color-border);
    }

    &--cancer &-title   { color: var(--color-danger);  }
    &--healthy &-title  { color: var(--color-primary); }
    &--window &-title   { color: var(--color-lime);    }
    &--virus &-title    { color: var(--color-purple);  }
    &--bacteria &-title { color: var(--color-amber);   }
  }

  &__ref-block-title {
    font-size: 0.7rem;
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--color-text-muted);
  }

  &__ref-block-params {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  &__rp-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.8rem;
    color: var(--color-text-muted);
    gap: 0.5rem;
  }

  &__window-ratio {
    font-size: 2.5rem;
    font-weight: 800;
    font-family: var(--font-mono);
    color: var(--color-lime);
    line-height: 1;

    &--sm    { font-size: 1.1rem; }
    &--muted { color: var(--color-text-muted); }
  }

  &__window-stat {
    &--spaced { margin-top: 0.4rem; }
  }

  &__window-label {
    font-size: 0.7rem;
    color: var(--color-text-muted);
    line-height: 1.4;
  }

  &__window-note {
    font-size: 0.78rem;
    color: var(--color-text-muted);
    line-height: 1.5;

    &--spaced { margin-top: 0.6rem; }
  }

  &__window-range {
    font-size: 0.78rem;
    color: var(--color-text-muted);
  }

  /* ── Geometry note ────────────────────────────────────────────────────────── */
  &__geo-text {
    font-size: 0.88rem;
    color: var(--color-text);
    line-height: 1.8;
    margin: 0 0 1.25rem;

    strong { color: var(--color-text-heading); }
  }

  &__geo-assumptions {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 0.5rem;
  }

  &__geo-item {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }

  &__geo-icon {
    color: var(--color-primary);
    flex-shrink: 0;
  }

  /* ── Open lab CTA ─────────────────────────────────────────────────────────── */
  &__open-lab {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  &__btn-lab {
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

    &:hover {
      filter: brightness(1.1);
      box-shadow: 0 0 32px rgba(0, 212, 255, 0.5);
    }
  }

  &__open-lab-note {
    font-size: 0.78rem;
    color: var(--color-text-muted);
    font-family: var(--font-mono);
  }
}

/* ── Responsive ───────────────────────────────────────────────────────────── */
@media (max-width: 900px) {
  .datasets__ref-grid {
    grid-template-columns: 1fr;
  }
  .datasets__ref-block + .datasets__ref-block {
    border-left: none;
    border-top: 1px solid var(--color-border);
  }
}

@media (max-width: 600px) {
  .datasets__inner { padding: 1rem 1rem 3rem; }
}
</style>
