<script lang="ts">
import { defineComponent } from 'vue'
export default defineComponent({})
</script>

<template>
  <div class="protocol-page">
    <div class="protocol-inner">

      <!-- Page header -->
      <div class="page-header">
        <div class="page-eyebrow">
          <span class="eyebrow-dot"></span>
          Scientific Protocol
        </div>
        <h1 class="page-title">Experimental Protocol</h1>
        <p class="page-subtitle">
          Biophysical model documentation · Schwan equation framework · Step-by-step research guide
        </p>
      </div>

      <!-- Two-column layout: TOC + content -->
      <div class="protocol-layout">

        <!-- Sidebar TOC -->
        <nav class="toc" aria-label="Table of contents">
          <div class="toc-title">Contents</div>
          <a href="#overview"    class="toc-link">1. Overview</a>
          <a href="#physics"     class="toc-link">2. Physical Model</a>
          <a href="#schwan"      class="toc-link indent">2.1 Schwan Equation</a>
          <a href="#thermal"     class="toc-link indent">2.2 SAR &amp; Thermal Model</a>
          <a href="#disruption"  class="toc-link indent">2.3 Disruption Criterion</a>
          <a href="#protocol"    class="toc-link">3. Experimental Protocol</a>
          <a href="#safety"      class="toc-link">4. Safety &amp; Thresholds</a>
          <a href="#refs"        class="toc-link">5. References</a>
        </nav>

        <!-- Main document -->
        <article class="doc">

          <!-- 1. Overview -->
          <section id="overview" class="doc-section">
            <h2 class="sec-title">1. Overview</h2>
            <p class="body-text">
              The BioResonance platform is a research visualisation tool for studying the effects of
              applied electric fields on biological membranes using the
              <strong>Schwan single-shell dielectric model</strong>. It computes the transmembrane
              potential (V<sub>m</sub>) induced by a uniform alternating electric field, the specific
              absorption rate (SAR) for thermal modelling, and the resulting disruption ratio for
              each cell or pathogen type.
            </p>
            <p class="body-text">
              The underlying model is based on the classic Schwan equation (1957), extended to include
              frequency-dependent membrane responses across the 10 kHz–500 MHz range relevant to
              tumour treating fields (TTFields), electroporation, and high-frequency selective
              disruption. Cancer cells, bacteria, and enveloped viruses each exhibit distinct
              characteristic frequencies (f<sub>c</sub>) set by their size and membrane capacitance,
              enabling frequency-selective targeting.
            </p>
            <div class="info-box">
              <span class="info-icon">ℹ</span>
              <span>
                This platform is intended for research visualisation only and does not constitute
                clinical guidance or a validated medical device. All biophysical parameters are
                approximate values derived from the bioelectromagnetics literature.
              </span>
            </div>
          </section>

          <!-- 2. Physical Model -->
          <section id="physics" class="doc-section">
            <h2 class="sec-title">2. Physical Model</h2>

            <h3 id="schwan" class="subsec-title">2.1 Schwan Equation</h3>
            <p class="body-text">
              For a spherical cell modelled as a single-shell dielectric in a uniform AC electric
              field, the peak induced transmembrane potential is given by:
            </p>
            <div class="eq-block">
              <div class="eq-main">V<sub>m</sub>(f) = (1.5 · E · R) / √[1 + (ωτ)²]</div>
              <div class="eq-divider"></div>
              <div class="eq-sub">ω = 2πf &nbsp;&nbsp; τ = R · C<sub>m</sub> · (2σ<sub>e</sub> + σ<sub>i</sub>) / (2σ<sub>e</sub> · σ<sub>i</sub>)</div>
              <div class="eq-sub">C<sub>m</sub> = ε<sub>r</sub> · ε₀ / d &nbsp;&nbsp; f<sub>c</sub> = 1 / (2πτ)</div>
              <div class="eq-note">Kotnik &amp; Miklavcic, Biophys. J. 79:670 (2000)</div>
            </div>
            <p class="body-text">
              The membrane time constant τ determines the characteristic frequency
              f<sub>c</sub> = 1/(2πτ), above which V<sub>m</sub> falls at −20 dB/decade.
              Cells with large radius R, high membrane permittivity ε<sub>r</sub>, or thin membrane
              d exhibit a larger C<sub>m</sub> and lower f<sub>c</sub>, making them preferentially
              disrupted at lower frequencies relative to smaller reference cells.
            </p>

            <table class="param-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Parameter</th>
                  <th>Unit</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr><td class="mono">E</td><td>Applied electric field</td><td class="mono">V/m (= V/cm × 100)</td><td>User-controlled · Field Intensity slider</td></tr>
                <tr><td class="mono">R</td><td>Cell radius</td><td class="mono">m (µm × 10⁻⁶)</td><td>Cell-type specific · user-editable</td></tr>
                <tr><td class="mono">f</td><td>Field frequency</td><td class="mono">Hz (kHz × 10³)</td><td>User-controlled · RF Frequency slider</td></tr>
                <tr><td class="mono">τ</td><td>Membrane time constant</td><td class="mono">s</td><td>Computed from C<sub>m</sub> and conductivities</td></tr>
                <tr><td class="mono">C<sub>m</sub></td><td>Membrane capacitance density</td><td class="mono">F/m²</td><td>ε<sub>r</sub>·ε₀ / d</td></tr>
                <tr><td class="mono">ε<sub>r</sub></td><td>Membrane relative permittivity</td><td class="mono">—</td><td>4.5 (RBC) to 25 (enveloped virus)</td></tr>
                <tr><td class="mono">d</td><td>Membrane thickness</td><td class="mono">nm</td><td>4.5–20 nm depending on cell type</td></tr>
                <tr><td class="mono">σ<sub>e</sub></td><td>Extracellular conductivity</td><td class="mono">S/m</td><td>Medium-dependent (0.001–1.5 S/m)</td></tr>
                <tr><td class="mono">σ<sub>i</sub></td><td>Cytoplasm conductivity</td><td class="mono">S/m</td><td>Cell-type specific · user-editable</td></tr>
                <tr><td class="mono">f<sub>c</sub></td><td>Characteristic frequency</td><td class="mono">kHz / MHz</td><td>Shown as ▼ markers on the Bode chart</td></tr>
              </tbody>
            </table>

            <h3 id="thermal" class="subsec-title">2.2 SAR &amp; Thermal Model</h3>
            <p class="body-text">
              Ohmic heating is modelled via the specific absorption rate (SAR), with a Newton
              cooling term representing perfusion and thermal conduction:
            </p>
            <div class="eq-block">
              <div class="eq-main">SAR = σ<sub>i</sub> · α² · E² · w<sub>f</sub> / ρ</div>
              <div class="eq-sub">α = 3σ<sub>e</sub> / (2σ<sub>e</sub> + σ<sub>i</sub>) &nbsp; (internal field factor for sphere in medium)</div>
              <div class="eq-sub">w<sub>f</sub> = 0.5 (CW sinusoidal, E²<sub>rms</sub> = E²<sub>peak</sub>/2) &nbsp;|&nbsp; 1.0 (pulsed DC)</div>
              <div class="eq-divider"></div>
              <div class="eq-main">dT/dt = SAR / c<sub>p</sub> − λ·(T − T₀)</div>
              <div class="eq-sub">λ = 0.02 s⁻¹ · T₀ = 37 °C · updated every 100 ms</div>
            </div>
            <p class="body-text">
              The cooling coefficient λ approximates combined perfusion and thermal conduction
              losses. At steady state (dT/dt = 0):
              T<sub>ss</sub> = T₀ + SAR / (λ · c<sub>p</sub>).
              A hyperthermic warning is issued when T exceeds 42 °C. Sustained application above
              ~700 V/cm in saline approaches protein denaturation thresholds for most tissue types.
            </p>

            <h3 id="disruption" class="subsec-title">2.3 Disruption Criterion</h3>
            <p class="body-text">
              Membrane disruption (electroporation / lysis) is initiated when the disruption ratio
              exceeds unity for a sustained period:
            </p>
            <div class="eq-block">
              <div class="eq-main">Disruption Ratio = V<sub>m</sub>(f) / V<sub>m,threshold</sub></div>
              <div class="eq-sub">Lysis triggered when Disruption Ratio &gt; 1.0 sustained for ≥ 2.5 s</div>
            </div>
            <p class="body-text">
              Cancer cells exhibit lower V<sub>m,threshold</sub> (~0.65–0.85 V) than healthy tissue
              (~1.0–1.1 V), creating a therapeutic window where tumour cell disruption occurs at
              sub-lethal field intensities for normal cells.
            </p>
            <p class="body-text">
              <strong>Note — IRE vs TTFields:</strong> This simulator models
              <em>irreversible electroporation</em> (IRE) — a high-field pulsed modality
              (200–3000 V/cm) in which the transmembrane potential exceeds the V<sub>m</sub>
              electroporation threshold, causing permanent membrane disruption. It is
              <em>distinct</em> from Tumour Treating Fields (TTFields, Kirson et al. 2007), which
              operate at low field intensities (~1–2 V/cm) via mitotic spindle disruption and do
              not rely on V<sub>m</sub> threshold crossing. The size-dependent selectivity
              modelled here (larger R → higher V<sub>m</sub>) applies to the IRE/electroporation
              regime. For adenocarcinoma vs. hepatocyte in saline, the adenocarcinoma has a
              longer time constant (τ<sub>T</sub> = 326 ns) than the hepatocyte (τ<sub>H</sub> = 148 ns),
              so both f<sub>c</sub>(T) ≈ 0.49 MHz and f<sub>c</sub>(H) ≈ 1.08 MHz are well above
              the operating range. Maximum V<sub>m</sub> selectivity ≈ R<sub>T</sub>/R<sub>H</sub>
              = <strong>1.5×</strong> occurs at quasi-DC (f ≪ f<sub>c</sub>(T)); selectivity
              <em>decreases</em> with increasing frequency as the target rolls off before the
              healthy cell. The Therapeutic Index (TI = (V<sub>t</sub>/V<sub>t,thr</sub>) /
              (V<sub>h</sub>/V<sub>h,thr</sub>)), which accounts for different lysis thresholds,
              reaches <strong>~2.4×</strong> at quasi-DC.
            </p>
          </section>

          <!-- 3. Step-by-step protocol -->
          <section id="protocol" class="doc-section">
            <h2 class="sec-title">3. Experimental Protocol</h2>
            <ol class="protocol-steps">
              <li class="step">
                <div class="step-num">01</div>
                <div class="step-body">
                  <div class="step-title">Select target cell type</div>
                  <p class="step-desc">
                    In the Experiment Lab, use the Target preset pills in the Selectivity Panel
                    to choose the pathogen of interest (cancer, bacteria, or virus). Each preset
                    loads biophysical parameters from the cell library (see Data Sets tab).
                    Alternatively, open the Cell Parameters panel on the target card to enter
                    custom values.
                  </p>
                </div>
              </li>
              <li class="step">
                <div class="step-num">02</div>
                <div class="step-body">
                  <div class="step-title">Set propagation medium</div>
                  <p class="step-desc">
                    Choose the extracellular medium (Saline, Blood, Tissue, or Water) using the
                    radio pills in the Field Control panel. The medium conductivity σ<sub>e</sub>
                    directly modifies τ for all cells, shifting f<sub>c</sub> markers on the chart
                    and scaling V<sub>m</sub>. Physiological saline (σ<sub>e</sub> = 1.5 S/m) is
                    the standard reference medium for in vitro experiments.
                  </p>
                </div>
              </li>
              <li class="step">
                <div class="step-num">03</div>
                <div class="step-body">
                  <div class="step-title">Establish baseline at sub-threshold field</div>
                  <p class="step-desc">
                    Begin with the default field intensity of 150 V/cm. Both cells should display
                    disruption ratios well below 50%. Click <em>Log Reading</em> in the Experiment
                    Log panel to record the baseline state. This first manual entry anchors the
                    session dataset.
                  </p>
                </div>
              </li>
              <li class="step">
                <div class="step-num">04</div>
                <div class="step-body">
                  <div class="step-title">Identify the optimal frequency window</div>
                  <p class="step-desc">
                    On the Transmembrane Potential Response chart, the golden ⭐ marker shows the
                    optimal broadcast frequency. For cancer vs. normal cell pairs (τ<sub>T</sub> &gt;
                    τ<sub>H</sub>), selectivity is maximised in the quasi-DC regime
                    (f ≪ f<sub>c</sub>(T)), where V<sub>m</sub> selectivity = R<sub>T</sub>/R<sub>H</sub>.
                    The f<sub>c</sub>(T) and f<sub>c</sub>(H) markers show where each cell's
                    V<sub>m</sub> begins to roll off. Operating <em>above</em> f<sub>c</sub>(T)
                    reduces selectivity — the target attenuates before the healthy cell.
                    Drag the cursor toward the lowest frequency and observe the Selectivity Panel
                    update in real time.
                  </p>
                </div>
              </li>
              <li class="step">
                <div class="step-num">05</div>
                <div class="step-body">
                  <div class="step-title">Sweep frequency for maximum selectivity</div>
                  <p class="step-desc">
                    Drag the RF Frequency slider from 10 kHz to 500 kHz and observe the
                    Selectivity Ratio. A ratio ≥ 1.5× is classified as a strong therapeutic
                    window (green); 1.0–1.5× is marginal (amber). For most cancer vs. epithelial
                    pairings in saline, maximum selectivity occurs at quasi-DC (well below
                    f<sub>c</sub>(T) ≈ 0.49 MHz for adenocarcinoma). Click the ⭐ optimal note
                    in the Selectivity Panel to snap the cursor to the optimal frequency and
                    log a reading there.
                  </p>
                </div>
              </li>
              <li class="step">
                <div class="step-num">06</div>
                <div class="step-body">
                  <div class="step-title">Increase field intensity toward target threshold</div>
                  <p class="step-desc">
                    Raise the Field Intensity slider incrementally. Monitor the Target disruption
                    ratio on the CellCard and Selectivity Panel progress bars. For adenocarcinoma
                    vs. hepatocyte in saline at 100 kHz (quasi-DC), lysis occurs near ~311 V/cm for the cancer
                    cell while the healthy cell remains below 50% disruption. Log readings at each
                    significant threshold crossing.
                  </p>
                </div>
              </li>
              <li class="step">
                <div class="step-num">07</div>
                <div class="step-body">
                  <div class="step-title">Record lysis event and review temperature</div>
                  <p class="step-desc">
                    When target cell lysis occurs, an entry is automatically added to the Experiment
                    Log with event type <em>lysis</em>. Check the temperature readout on both cell
                    cards. If temperature approaches 42 °C, consider reducing the field intensity
                    or switching to a lower-conductivity medium to reduce SAR.
                  </p>
                </div>
              </li>
              <li class="step">
                <div class="step-num">08</div>
                <div class="step-body">
                  <div class="step-title">Change cell preset and repeat parametric study</div>
                  <p class="step-desc">
                    Switch to a different target preset (e.g. GBM, MCF-7, E. coli) and repeat
                    steps 4–7. Compare selectivity ratios, f<sub>c</sub> positions, and lysis
                    thresholds across cell types. Use the Cell Parameters panel to perform
                    sensitivity analysis around published values.
                  </p>
                </div>
              </li>
              <li class="step">
                <div class="step-num">09</div>
                <div class="step-body">
                  <div class="step-title">Export session data for analysis</div>
                  <p class="step-desc">
                    Navigate to the Reports tab to review the full session log. Edit the session
                    name, then click <em>Export CSV</em> to download a structured comma-separated
                    file containing all logged parameters: frequency, field, V<sub>m</sub>,
                    selectivity ratio, disruption ratios, temperatures, and event type.
                  </p>
                </div>
              </li>
            </ol>
          </section>

          <!-- 4. Safety -->
          <section id="safety" class="doc-section">
            <h2 class="sec-title">4. Safety &amp; Thresholds</h2>
            <p class="body-text">
              The following reference thresholds are used in the simulation and are based on
              published bioelectromagnetics literature.
            </p>
            <table class="param-table">
              <thead>
                <tr><th>Parameter</th><th>Value</th><th>Significance</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td>V<sub>m,thr</sub> cancer cells</td>
                  <td class="mono cancer-val">0.65–0.85 V</td>
                  <td>Electroporation threshold; irreversible membrane disruption</td>
                </tr>
                <tr>
                  <td>V<sub>m,thr</sub> healthy tissue</td>
                  <td class="mono ref-val">1.0–1.1 V</td>
                  <td>Normal epithelial / hepatocyte electroporation threshold</td>
                </tr>
                <tr>
                  <td>V<sub>m,thr</sub> bacteria</td>
                  <td class="mono warn-val">1.5–2.0 V</td>
                  <td>Higher due to cell wall reinforcement (peptidoglycan)</td>
                </tr>
                <tr>
                  <td>Hyperthermic onset</td>
                  <td class="mono warn-val">42 °C</td>
                  <td>Sustained thermal damage onset; cancer cells more susceptible than normal tissue (IAHT threshold)</td>
                </tr>
                <tr>
                  <td>IEC 60601-2-33 SAR limit</td>
                  <td class="mono warn-val">4 W/kg</td>
                  <td>Regulatory whole-body average SAR limit for RF medical devices</td>
                </tr>
                <tr>
                  <td>IEEE C95.1 SAR limit</td>
                  <td class="mono warn-val">1.6 W/kg</td>
                  <td>FCC/IEEE partial-body SAR limit (1 g tissue average)</td>
                </tr>
                <tr>
                  <td>Lysis hold time</td>
                  <td class="mono mono-val">2.5 s</td>
                  <td>Duration Disruption Ratio must exceed 1.0 before lysis event fires</td>
                </tr>
                <tr>
                  <td>IRE / electroporation field range</td>
                  <td class="mono primary-val">100–1000 V/cm</td>
                  <td>Sub-ablative to ablative IRE range (Davalos 2005). Note: TTFields (Kirson 2007) use ~1–3 V/cm via mitotic spindle disruption — a distinct, non-V<sub>m</sub>-threshold mechanism not modelled here</td>
                </tr>
              </tbody>
            </table>
          </section>

          <!-- 5. References -->
          <section id="refs" class="doc-section">
            <h2 class="sec-title">5. References</h2>
            <ol class="refs-list">
              <li class="ref-item">
                <span class="ref-num">[1]</span>
                <span class="ref-body">
                  Schwan HP. <em>Electrical properties of tissue and cell suspensions.</em>
                  Advances in Biological and Medical Physics. 1957;5:147–209.
                  doi:10.1016/B978-1-4832-3111-2.50008-0
                </span>
              </li>
              <li class="ref-item">
                <span class="ref-num">[2]</span>
                <span class="ref-body">
                  Kirson ED, Dbaly V, Tovarys F, et al.
                  <em>Alternating electric fields arrest cell proliferation in animal tumor
                  models and human brain tumors.</em>
                  Proceedings of the National Academy of Sciences. 2007;104(24):10152–10157.
                  doi:10.1073/pnas.0702916104
                </span>
              </li>
              <li class="ref-item">
                <span class="ref-num">[3]</span>
                <span class="ref-body">
                  Weaver JC, Chizmadzhev YA.
                  <em>Theory of electroporation: a review.</em>
                  Bioelectrochemistry and Bioenergetics. 1996;41(2):135–160.
                  doi:10.1016/S0302-4598(96)05062-3
                </span>
              </li>
              <li class="ref-item">
                <span class="ref-num">[4]</span>
                <span class="ref-body">
                  Davalos RV, Mir LM, Rubinsky B.
                  <em>Tissue ablation with irreversible electroporation.</em>
                  Annals of Biomedical Engineering. 2005;33(2):223–231.
                  doi:10.1007/s10439-005-8981-8
                </span>
              </li>
              <li class="ref-item">
                <span class="ref-num">[5]</span>
                <span class="ref-body">
                  Foster KR, Schwan HP.
                  <em>Dielectric properties of tissues and biological materials: a critical review.</em>
                  Critical Reviews in Biomedical Engineering. 1989;17(1):25–104.
                  PMID:2651001
                </span>
              </li>
              <li class="ref-item">
                <span class="ref-num">[6]</span>
                <span class="ref-body">
                  Dimova R, Riske KA, Aranda S, et al.
                  <em>Giant vesicles in electric fields.</em>
                  Soft Matter. 2007;3(7):817–827.
                  doi:10.1039/B703580B
                </span>
              </li>
              <li class="ref-item">
                <span class="ref-num">[7]</span>
                <span class="ref-body">
                  Neumann E, Schaefer-Ridder M, Wang Y, Hofschneider PH.
                  <em>Gene transfer into mouse lyoma cells by electroporation in high electric fields.</em>
                  EMBO Journal. 1982;1(7):841–845.
                  doi:10.1002/j.1460-2075.1982.tb01257.x
                </span>
              </li>
              <li class="ref-item">
                <span class="ref-num">[8]</span>
                <span class="ref-body">
                  Stacey M, Stickley J, Fox P, et al.
                  <em>Differential effects in cells exposed to ultra-short, high intensity
                  electric fields: cell survival, DNA damage, and cell cycle analysis.</em>
                  Mutation Research. 2003;542(1–2):65–75.
                  doi:10.1016/j.mrgentox.2003.08.006
                </span>
              </li>
              <li class="ref-item">
                <span class="ref-num">[9]</span>
                <span class="ref-body">
                  Kotnik T, Miklavcic D.
                  <em>Analytical description of transmembrane voltage induced by electric fields on
                  spheroidal cells.</em>
                  Biophysical Journal. 2000;79(2):670–679.
                  doi:10.1016/S0006-3495(00)76325-9
                  <span class="ref-note">[Source of the corrected τ = R·C<sub>m</sub>·(2σ<sub>e</sub>+σ<sub>i</sub>)/(2σ<sub>e</sub>·σ<sub>i</sub>) formula used in this simulator]</span>
                </span>
              </li>
            </ol>
          </section>

        </article>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Page shell ───────────────────────────────────────────────────────────── */
.protocol-page {
  flex: 1;
  overflow-y: auto;
  background-color: var(--color-bg);
}

.protocol-inner {
  max-width: 1600px;
  margin: 0 auto;
  padding: 2rem 2rem 4rem;
}

/* ── Page header ──────────────────────────────────────────────────────────── */
.page-header {
  margin-bottom: 2.5rem;
}

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
}

/* ── Two-column layout ────────────────────────────────────────────────────── */
.protocol-layout {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 2.5rem;
  align-items: start;
}

/* ── TOC ──────────────────────────────────────────────────────────────────── */
.toc {
  position: sticky;
  top: 80px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.05rem;
}

.toc-title {
  font-size: 0.65rem;
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--color-text-muted);
  margin-bottom: 0.65rem;
}

.toc-link {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  text-decoration: none;
  padding: 0.3rem 0.5rem;
  border-radius: 4px;
  transition: color 0.15s, background-color 0.15s;
  line-height: 1.4;
}

.toc-link.indent {
  padding-left: 1.1rem;
  font-size: 0.75rem;
}

.toc-link:hover {
  color: var(--color-primary);
  background-color: var(--color-primary-dim);
}

/* ── Article ──────────────────────────────────────────────────────────────── */
.doc {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.doc-section {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.sec-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text-heading);
  margin: 0;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--color-border);
}

.subsec-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-primary);
  margin: 0.5rem 0 0;
  font-family: var(--font-mono);
  letter-spacing: 0.03em;
}

.body-text {
  font-size: 0.9rem;
  color: var(--color-text);
  line-height: 1.8;
  margin: 0;
}

.body-text strong {
  color: var(--color-text-heading);
}

/* ── Info box ─────────────────────────────────────────────────────────────── */
.info-box {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  background: var(--color-primary-dim);
  border: 1px solid rgba(0, 212, 255, 0.25);
  border-radius: var(--radius);
  padding: 0.85rem 1rem;
  font-size: 0.82rem;
  color: var(--color-text-muted);
  line-height: 1.6;
}

.info-icon {
  color: var(--color-primary);
  font-weight: 700;
  flex-shrink: 0;
  margin-top: 0.05rem;
}

/* ── Equation blocks ──────────────────────────────────────────────────────── */
.eq-block {
  background: var(--color-surface-2, #0a1628);
  border: 1px solid var(--color-border);
  border-left: 3px solid var(--color-primary);
  border-radius: var(--radius);
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.eq-main {
  font-size: 1rem;
  font-family: var(--font-mono);
  color: var(--color-text-heading);
  letter-spacing: 0.04em;
}

.eq-sub {
  font-size: 0.78rem;
  font-family: var(--font-mono);
  color: var(--color-text-muted);
}

.eq-divider {
  height: 1px;
  background: var(--color-border);
  margin: 0.25rem 0;
}

.eq-note {
  font-size: 0.68rem;
  font-family: var(--font-mono);
  color: var(--color-text-muted);
  opacity: 0.6;
  margin-top: 0.15rem;
}

/* ── Parameter table ──────────────────────────────────────────────────────── */
.param-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
}

.param-table th {
  text-align: left;
  padding: 0.55rem 0.75rem;
  font-size: 0.68rem;
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-muted);
  border-bottom: 1px solid var(--color-border);
  background: rgba(255, 255, 255, 0.02);
}

.param-table td {
  padding: 0.6rem 0.75rem;
  color: var(--color-text);
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  line-height: 1.5;
}

.param-table tr:last-child td { border-bottom: none; }
.param-table tr:hover td { background: rgba(255, 255, 255, 0.025); }

.mono      { font-family: var(--font-mono); font-size: 0.8rem; }
.cancer-val { color: #ff4d6d; }
.ref-val    { color: #00d4ff; }
.warn-val   { color: #fbbf24; }
.mono-val   { color: var(--color-text-muted); }
.primary-val { color: var(--color-primary); }

/* ── Protocol steps ───────────────────────────────────────────────────────── */
.protocol-steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.step {
  display: flex;
  gap: 1.25rem;
  padding: 1.1rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.step:last-child { border-bottom: none; }

.step-num {
  font-size: 0.68rem;
  font-family: var(--font-mono);
  color: var(--color-primary);
  background: var(--color-primary-dim);
  border: 1px solid rgba(0, 212, 255, 0.2);
  border-radius: 4px;
  padding: 0.2rem 0.45rem;
  flex-shrink: 0;
  height: fit-content;
  letter-spacing: 0.08em;
}

.step-body {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.step-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text-heading);
}

.step-desc {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  line-height: 1.7;
  margin: 0;
}

.step-desc em {
  color: var(--color-primary);
  font-style: normal;
}

/* ── References ───────────────────────────────────────────────────────────── */
.refs-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.ref-item {
  display: flex;
  gap: 0.75rem;
  padding: 0.9rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.ref-item:last-child { border-bottom: none; }

.ref-num {
  font-size: 0.75rem;
  font-family: var(--font-mono);
  color: var(--color-primary);
  flex-shrink: 0;
  width: 2.25rem;
  padding-top: 0.05rem;
}

.ref-body {
  font-size: 0.82rem;
  color: var(--color-text-muted);
  line-height: 1.7;
}

.ref-body em {
  color: var(--color-text);
  font-style: italic;
}

.ref-note {
  display: block;
  font-size: 0.72rem;
  color: var(--color-primary);
  opacity: 0.7;
  margin-top: 0.15rem;
  font-family: var(--font-mono);
}

/* ── Responsive ───────────────────────────────────────────────────────────── */
@media (max-width: 900px) {
  .protocol-layout {
    grid-template-columns: 1fr;
  }
  .toc {
    position: static;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 0.25rem;
  }
  .toc-title { width: 100%; }
  .toc-link { font-size: 0.75rem; }
}

@media (max-width: 600px) {
  .protocol-inner { padding: 1rem 1rem 3rem; }
  .doc-section    { padding: 1.25rem; }
}
</style>
