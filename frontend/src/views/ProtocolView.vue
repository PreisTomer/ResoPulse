<script lang="ts">
import { defineComponent } from 'vue'
export default defineComponent({})
</script>

<template>
  <div class="protocol">
    <div class="protocol__inner">

      <!-- Page header -->
      <div class="protocol__header">
        <div class="protocol__eyebrow">
          <span class="protocol__eyebrow-dot"></span>
          Scientific Protocol
        </div>
        <h1 class="protocol__title">Experimental Protocol</h1>
        <p class="protocol__subtitle">
          Biophysical model documentation · Schwan equation · Acoustic resonance · Step-by-step research guide
        </p>
      </div>

      <!-- Two-column layout: TOC + content -->
      <div class="protocol__layout">

        <!-- Sidebar TOC -->
        <nav class="protocol__toc" aria-label="Table of contents">
          <div class="protocol__toc-title">Contents</div>
          <a href="#overview"    class="protocol__toc-link">1. Overview</a>
          <a href="#physics"     class="protocol__toc-link">2. Physical Model</a>
          <a href="#schwan"      class="protocol__toc-link protocol__toc-indent">2.1 Schwan Equation</a>
          <a href="#thermal"     class="protocol__toc-link protocol__toc-indent">2.2 SAR &amp; Thermal Model</a>
          <a href="#disruption"  class="protocol__toc-link protocol__toc-indent">2.3 Disruption Criterion (IRE)</a>
          <a href="#resonance"   class="protocol__toc-link protocol__toc-indent">2.4 Acoustic Resonance (Virus/Bacteria)</a>
          <a href="#nsep"        class="protocol__toc-link protocol__toc-indent">2.5 nsEP Pulse Selectivity</a>
          <a href="#doubleshell" class="protocol__toc-link protocol__toc-indent">2.6 Double-Shell Nuclear Envelope</a>
          <a href="#protocol"    class="protocol__toc-link">3. Experimental Protocol</a>
          <a href="#safety"      class="protocol__toc-link">4. Safety &amp; Thresholds</a>
          <a href="#refs"        class="protocol__toc-link">5. References</a>
        </nav>

        <!-- Main document -->
        <article class="protocol__doc">

          <!-- 1. Overview -->
          <section id="overview" class="protocol__section">
            <h2 class="protocol__section-title">1. Overview</h2>
            <p class="protocol__body-text">
              The BioResonance platform is a research visualisation tool for studying the effects of
              applied electric fields on biological membranes using the
              <strong>Schwan single-shell dielectric model</strong>. It computes the transmembrane
              potential (V<sub>m</sub>) induced by a uniform alternating electric field, the specific
              absorption rate (SAR) for thermal modelling, and the resulting disruption ratio for
              each cell or pathogen type.
            </p>
            <p class="protocol__body-text">
              The underlying model is based on the classic Schwan equation (1957), extended to include
              frequency-dependent membrane responses across the 10 kHz–500 MHz range relevant to
              tumour treating fields (TTFields), electroporation, and high-frequency selective
              disruption. Cancer cells, bacteria, and enveloped viruses each exhibit distinct
              characteristic frequencies (f<sub>c</sub>) set by their size and membrane capacitance,
              enabling frequency-selective targeting.
            </p>
            <div class="protocol__info-box">
              <span class="protocol__info-icon">ℹ</span>
              <span>
                This platform is intended for research visualisation only and does not constitute
                clinical guidance or a validated medical device. All biophysical parameters are
                approximate values derived from the bioelectromagnetics literature.
              </span>
            </div>
          </section>

          <!-- 2. Physical Model -->
          <section id="physics" class="protocol__section">
            <h2 class="protocol__section-title">2. Physical Model</h2>

            <h3 id="schwan" class="protocol__subsection-title">2.1 Schwan Equation</h3>
            <p class="protocol__body-text">
              For a spherical cell modelled as a single-shell dielectric in a uniform AC electric
              field, the peak induced transmembrane potential is given by:
            </p>
            <div class="protocol__eq-block">
              <div class="protocol__eq-main">V<sub>m</sub>(f) = (1.5 · E · R) / √[1 + (ωτ)²]</div>
              <div class="protocol__eq-divider"></div>
              <div class="protocol__eq-sub">ω = 2πf &nbsp;&nbsp; τ = R · C<sub>m</sub> · (2σ<sub>e</sub> + σ<sub>i</sub>) / (2σ<sub>e</sub> · σ<sub>i</sub>)</div>
              <div class="protocol__eq-sub">C<sub>m</sub> = ε<sub>r</sub> · ε₀ / d &nbsp;&nbsp; f<sub>c</sub> = 1 / (2πτ)</div>
              <div class="protocol__eq-note">Kotnik &amp; Miklavcic, Biophys. J. 79:670 (2000) [9]</div>
            </div>
            <p class="protocol__body-text">
              The membrane time constant τ determines the characteristic frequency
              f<sub>c</sub> = 1/(2πτ), above which V<sub>m</sub> falls at −20 dB/decade.
              Cells with large radius R, high membrane permittivity ε<sub>r</sub>, or thin membrane
              d exhibit a larger C<sub>m</sub> and lower f<sub>c</sub>, making them preferentially
              disrupted at lower frequencies relative to smaller reference cells.
            </p>

            <table class="protocol__param-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Parameter</th>
                  <th>Unit</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr><td class="protocol__mono">E</td><td>Applied electric field</td><td class="protocol__mono">V/m (= V/cm × 100)</td><td>User-controlled · Field Intensity slider</td></tr>
                <tr><td class="protocol__mono">R</td><td>Cell radius</td><td class="protocol__mono">m (µm × 10⁻⁶)</td><td>Cell-type specific · user-editable</td></tr>
                <tr><td class="protocol__mono">f</td><td>Field frequency</td><td class="protocol__mono">Hz (kHz × 10³)</td><td>User-controlled · RF Frequency slider</td></tr>
                <tr><td class="protocol__mono">τ</td><td>Membrane time constant</td><td class="protocol__mono">s</td><td>Computed from C<sub>m</sub> and conductivities</td></tr>
                <tr><td class="protocol__mono">C<sub>m</sub></td><td>Membrane capacitance density</td><td class="protocol__mono">F/m²</td><td>ε<sub>r</sub>·ε₀ / d</td></tr>
                <tr><td class="protocol__mono">ε<sub>r</sub></td><td>Membrane relative permittivity</td><td class="protocol__mono">—</td><td>4.5 (RBC) to 25 (enveloped virus)</td></tr>
                <tr><td class="protocol__mono">d</td><td>Membrane thickness</td><td class="protocol__mono">nm</td><td>4.5–20 nm depending on cell type</td></tr>
                <tr><td class="protocol__mono">σ<sub>e</sub></td><td>Extracellular conductivity</td><td class="protocol__mono">S/m</td><td>Medium-dependent (0.001–1.5 S/m)</td></tr>
                <tr><td class="protocol__mono">σ<sub>i</sub></td><td>Cytoplasm conductivity</td><td class="protocol__mono">S/m</td><td>Cell-type specific · user-editable</td></tr>
                <tr><td class="protocol__mono">f<sub>c</sub></td><td>Characteristic frequency</td><td class="protocol__mono">kHz / MHz</td><td>Shown as ▼ markers on the Bode chart</td></tr>
              </tbody>
            </table>

            <h3 id="thermal" class="protocol__subsection-title">2.2 SAR &amp; Thermal Model</h3>
            <p class="protocol__body-text">
              Ohmic heating is modelled via the specific absorption rate (SAR), with a Newton
              cooling term representing perfusion and thermal conduction:
            </p>
            <div class="protocol__eq-block">
              <div class="protocol__eq-main">SAR = σ<sub>i</sub> · α² · E² · w<sub>f</sub> / ρ</div>
              <div class="protocol__eq-sub">α = 3σ<sub>e</sub> / (2σ<sub>e</sub> + σ<sub>i</sub>) &nbsp; (internal field factor for sphere in medium)</div>
              <div class="protocol__eq-sub">w<sub>f</sub> = 0.5 (CW sinusoidal, E²<sub>rms</sub> = E²<sub>peak</sub>/2) &nbsp;|&nbsp; 1.0 (pulsed DC)</div>
              <div class="protocol__eq-divider"></div>
              <div class="protocol__eq-main">dT/dt = SAR / c<sub>p</sub> − λ·(T − T₀)</div>
              <div class="protocol__eq-sub">λ = 0.02 s⁻¹ · T₀ = 37 °C · updated every 100 ms</div>
            </div>
            <p class="protocol__body-text">
              The cooling coefficient λ approximates combined perfusion and thermal conduction
              losses. For pulsed waveforms, the effective SAR is scaled by duty cycle:
              SAR<sub>eff</sub> = SAR<sub>peak</sub> × dc. At steady state (dT/dt = 0):
              T<sub>ss</sub> = T₀ + SAR<sub>eff</sub> / (λ · c<sub>p</sub>).
              A hyperthermic warning is issued when T exceeds 42 °C. Sustained application above
              ~700 V/cm in saline approaches protein denaturation thresholds for most tissue types.
            </p>
            <div class="protocol__warn-box">
              <span class="protocol__warn-icon">⚠</span>
              <span>
                <strong>SAR model limits:</strong>
                The internal field factor α = 3σ<sub>e</sub>/(2σ<sub>e</sub>+σ<sub>i</sub>) is the
                exact DC (quasi-static) Clausius-Mossotti solution for a sphere in a uniform field
                (Foster &amp; Schwan 1989 [5]). At frequencies above the characteristic frequency
                f<sub>c</sub>, the membrane capacitance increasingly shields the cell interior,
                so the true internal field — and therefore the true SAR — is lower than this
                model predicts. The SAR displayed here is an upper bound; the overestimate
                grows substantially at f ≫ f<sub>c</sub>.
                <br><br>
                <strong>Thermal model scope:</strong>
                The Newton cooling coefficient λ = 0.02 s⁻¹ (time constant τ<sub>th</sub> ≈ 50 s)
                represents <em>tissue-level</em> lumped heat dissipation via perfusion and thermal
                conduction, as appropriate for macroscopic electroporation applicators
                (Foster &amp; Schwan 1989 [5]). It is <strong>not</strong> a single-cell thermal
                model: a free cell in solution has τ<sub>th</sub> ≈ R²/(κ/ρc<sub>p</sub>) ≈ 0.6 µs
                and equilibrates with its medium essentially instantaneously on the timescale of
                pulsed protocols. The temperature displayed reflects bulk medium heating, not
                local membrane temperature.
              </span>
            </div>

            <h3 id="disruption" class="protocol__subsection-title">2.3 Disruption Criterion</h3>
            <p class="protocol__body-text">
              Membrane disruption (electroporation / lysis; Neumann et al. [7]) is initiated when the disruption ratio
              exceeds unity for a sustained period:
            </p>
            <div class="protocol__eq-block">
              <div class="protocol__eq-main">Disruption Ratio = V<sub>m</sub>(f) / V<sub>m,threshold</sub></div>
              <div class="protocol__eq-sub">Lysis triggered when Disruption Ratio &gt; 1.0 sustained for ≥ 2.5 s</div>
            </div>
            <p class="protocol__body-text">
              Cancer cells exhibit lower V<sub>m,threshold</sub> (~0.65–0.85 V) than healthy tissue
              (~1.0–1.1 V), creating a therapeutic window where tumour cell disruption occurs at
              sub-lethal field intensities for normal cells (Dimova et al. [6]).
            </p>
            <p class="protocol__body-text">
              <strong>Note — IRE vs TTFields:</strong> This simulator models
              <em>irreversible electroporation</em> (IRE) — a high-field pulsed modality
              (200–3000 V/cm) in which the transmembrane potential exceeds the V<sub>m</sub>
              electroporation threshold, causing permanent membrane disruption (Weaver &amp; Chizmadzhev [3]). It is
              <em>distinct</em> from Tumour Treating Fields (TTFields, Kirson et al. [2]), which
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

            <h3 id="resonance" class="protocol__subsection-title">2.4 Acoustic / Mechanical Resonance — Virus &amp; Bacteria</h3>
            <p class="protocol__body-text">
              For sub-micron targets (virions and bacteria), the Schwan model predicts
              <em>reduced</em> selectivity at quasi-DC because V<sub>m</sub> ∝ R — small cells
              generate lower transmembrane voltage than large cells under identical field conditions.
              The correct disruption mechanism at GHz frequencies is
              <strong>acoustic/mechanical resonance</strong> of the capsid protein shell or
              bacterial cell wall, modelled by a Lorentzian lineshape:
            </p>
            <div class="protocol__eq-block">
              <div class="protocol__eq-main">Disruption ratio = (E / E<sub>thr</sub>) × L(f, f<sub>res</sub>, Q)</div>
              <div class="protocol__eq-divider"></div>
              <div class="protocol__eq-sub">L(f) = 1 / √[ 1 + (Q · (f/f₀ − f₀/f))² ] &nbsp; (Lorentzian lineshape)</div>
              <div class="protocol__eq-sub">f<sub>res</sub> ≈ v<sub>protein</sub> / (2R) &nbsp;·&nbsp; v<sub>protein</sub> ≈ 1000–1500 m/s for protein/peptidoglycan</div>
              <div class="protocol__eq-sub">Q — mechanical quality factor (sharpness of resonance peak)</div>
              <div class="protocol__eq-note">Tsen et al., J. Biomed. Sci. (2007–2012) [10]; Dykeman &amp; Sankey, Phys. Rev. E (2010) [11]</div>
            </div>
            <p class="protocol__body-text">
              L(f<sub>res</sub>) = 1.0 at resonance; disruption ratio ≥ 1.0 triggers capsid/cell-wall
              disruption. Mammalian cells lack the rigid protein/peptidoglycan shell required for
              acoustic capsid/cell-wall resonance — their Schwan V<sub>m</sub> rolls off above
              ~1 MHz (ωτ ≫ 1) and approaches zero at GHz frequencies, leaving healthy tissue
              unperturbed at pathogen-targeting frequencies and conferring
              <strong>genuine frequency selectivity</strong>.
            </p>
            <table class="protocol__param-table">
              <thead>
                <tr>
                  <th>Target</th>
                  <th>f<sub>res</sub> (GHz)</th>
                  <th>Q</th>
                  <th>E<sub>thr</sub> (V/cm)</th>
                  <th>Basis</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Influenza A (R = 60 nm)</td>
                  <td class="protocol__mono protocol__primary-val">~12 GHz</td>
                  <td class="protocol__mono">30</td>
                  <td class="protocol__mono protocol__cancer-val">800</td>
                  <td>v<sub>protein</sub> ≈ 1440 m/s; Tsen et al. [10]</td>
                </tr>
                <tr>
                  <td>SARS-CoV-2 (R = 60 nm)</td>
                  <td class="protocol__mono protocol__primary-val">~10 GHz</td>
                  <td class="protocol__mono">25</td>
                  <td class="protocol__mono protocol__cancer-val">1000</td>
                  <td>Larger spike envelope lowers f<sub>res</sub>; Tsen et al. [10]</td>
                </tr>
                <tr>
                  <td>E. coli K-12 (R = 1 µm)</td>
                  <td class="protocol__mono protocol__primary-val">~0.5 GHz</td>
                  <td class="protocol__mono">15</td>
                  <td class="protocol__mono protocol__warn-val">2000</td>
                  <td>v<sub>wall</sub> ≈ 1000 m/s; gram-neg peptidoglycan</td>
                </tr>
                <tr>
                  <td>MRSA (R = 0.5 µm)</td>
                  <td class="protocol__mono protocol__primary-val">~1.5 GHz</td>
                  <td class="protocol__mono">12</td>
                  <td class="protocol__mono protocol__warn-val">3000</td>
                  <td>Thick peptidoglycan (20 nm); v<sub>wall</sub> ≈ 1500 m/s</td>
                </tr>
                <tr>
                  <td>Hepatocyte (R = 10 µm)</td>
                  <td class="protocol__mono protocol__muted">N/A</td>
                  <td class="protocol__mono protocol__muted">—</td>
                  <td class="protocol__mono protocol__muted">N/A</td>
                  <td>No rigid-shell resonance — Schwan V<sub>m</sub> → 0 at GHz (ωτ ≫ 1); unaffected at pathogen frequencies</td>
                </tr>
              </tbody>
            </table>
            <div class="protocol__info-box">
              <span class="protocol__info-icon">ℹ</span>
              <span>
                Switch to <strong>Resonance mode</strong> in the Experiment Lab (toggle button in the
                session bar) when working with bacterial or viral targets. The platform auto-tunes
                frequency to f<sub>res</sub> and sets field to 50% of E<sub>thr</sub> when a
                resonance-enabled preset is loaded.
              </span>
            </div>

            <div class="protocol__warn-box">
              <span class="protocol__warn-icon">⚠</span>
              <span>
                <strong>Excitation mechanism caveat:</strong> The f<sub>res</sub> and
                E<sub>thr</sub> values above are derived from <em>femtosecond pulsed laser</em>
                (near-IR, ~800 nm) experiments in which acoustic capsid modes are excited via
                impulsive stimulated Raman scattering — not direct RF/microwave delivery
                (Tsen et al. [10]). Direct microwave excitation at 10–12 GHz in bulk tissue
                remains experimentally unverified. Penetration depth in saline at these
                frequencies is ~1–2 mm (skin-depth limited). The simulation uses these
                parameters as theoretical research targets only.
              </span>
            </div>
            <div class="protocol__warn-box">
              <span class="protocol__warn-icon">⚠</span>
              <span>
                <strong>Enveloped vs. non-enveloped virus caveat:</strong>
                The Tsen et al. [10] and Dykeman &amp; Sankey [11] acoustic resonance model
                was experimentally validated on <em>non-enveloped</em> icosahedral protein-capsid
                viruses (M13 bacteriophage, TMV, CCMV). Influenza A and SARS-CoV-2 are
                <em>lipid-enveloped</em> RNA viruses — their envelope is a fluid lipid bilayer
                with embedded spike proteins, <strong>not</strong> a rigid protein capsid.
                A fluid lipid membrane has no well-defined mechanical resonance Q (Q ≈ 1,
                highly damped); the f<sub>res</sub>, Q, and E<sub>thr</sub> parameters
                for enveloped viruses in this table are theoretical extrapolations that are
                <strong>not supported by published experimental data</strong>. They are included
                as exploratory research targets only.
              </span>
            </div>

            <h3 id="nsep" class="protocol__subsection-title">2.5 Nanosecond Pulsed EP (nsEP) — Pulse Width Selectivity</h3>
            <p class="protocol__body-text">
              An alternative strategy for bacteria targeting in the Schwan (IRE) regime uses
              very short pulse widths (t<sub>p</sub> ≪ τ). The membrane charges as a
              <strong>pulse step response</strong>:
            </p>
            <div class="protocol__eq-block">
              <div class="protocol__eq-main">V<sub>m,eff</sub>(t<sub>p</sub>) = V<sub>m,DC</sub>(f) × (1 − exp(−t<sub>p</sub> / τ))</div>
              <div class="protocol__eq-sub">τ = R · C<sub>m</sub> · (2σ<sub>e</sub>+σ<sub>i</sub>) / (2σ<sub>e</sub>·σ<sub>i</sub>)</div>
              <div class="protocol__eq-note">Stacey et al. [8]; Schoenbach et al. [12]</div>
            </div>
            <p class="protocol__body-text">
              At t<sub>p</sub> = 10 ns in saline: τ<sub>E.coli</sub> ≈ 14 ns → factor ≈ 0.51;
              τ<sub>hepatocyte</sub> ≈ 147 ns → factor ≈ 0.065.
              The quasi-DC V<sub>m</sub> ratio of 0.10× (E. coli vs. hepatocyte) <em>improves</em>
              to ~0.78× — the small cell charges proportionally more per pulse than the large cell.
              The theoretical limit as t<sub>p</sub> → 0 is (τ<sub>H</sub>·R<sub>E</sub>) /
              (τ<sub>E</sub>·R<sub>H</sub>) ≈ 1.05×; even at this limit the Therapeutic Index
              remains &lt;1 because V<sub>m,thr,bacteria</sub> &gt; V<sub>m,thr,hepatocyte</sub>
              (cell-wall reinforcement raises the lysis threshold).
              Use the <strong>Pulse Width slider</strong> in pulsed waveform mode to explore this
              regime. Charging factors for both cells are displayed live next to the slider.
            </p>
          </section>

          <h3 id="doubleshell" class="protocol__subsection-title">2.6 Double-Shell Nuclear Envelope Model</h3>
            <p class="protocol__body-text">
              For mammalian nucleated cells, an optional <strong>double-shell model</strong>
              (Kotnik &amp; Miklavcic 2006 [13]) adds the nuclear membrane as a second
              concentric dielectric shell. The nuclear membrane Vm is a two-pole bandpass
              function of frequency:
            </p>
            <div class="protocol__eq-block">
              <div class="protocol__eq-main">V<sub>m,nuc</sub>(f) = (1.5 · E · R<sub>nuc</sub> · ω·τ<sub>out</sub>) / √[(1+(ωτ<sub>out</sub>)²) · (1+(ωτ<sub>ne</sub>)²)]</div>
              <div class="protocol__eq-divider"></div>
              <div class="protocol__eq-sub">τ<sub>out</sub> = R·C<sub>m</sub>·(2σ<sub>e</sub>+σ<sub>i</sub>)/(2σ<sub>e</sub>·σ<sub>i</sub>) &nbsp;(existing outer shell τ)</div>
              <div class="protocol__eq-sub">τ<sub>ne</sub> = R<sub>nuc</sub>·C<sub>m,ne</sub>·(2σ<sub>i</sub>+σ<sub>np</sub>)/(2σ<sub>i</sub>·σ<sub>np</sub>) &nbsp;·&nbsp; C<sub>m,ne</sub> = ε<sub>ne</sub>·ε₀/d<sub>ne</sub></div>
              <div class="protocol__eq-note-sub">σ<sub>i</sub> = cytoplasm conductivity (external medium for nucleus); σ<sub>np</sub> = nucleoplasm</div>
              <div class="protocol__eq-sub">f<sub>peak</sub> = 1/(2π√(τ<sub>out</sub>·τ<sub>ne</sub>)) &nbsp;·&nbsp; peak gain = τ<sub>out</sub>/(τ<sub>out</sub>+τ<sub>ne</sub>)</div>
              <div class="protocol__eq-note">Kotnik &amp; Miklavcic, Biophys. J. 90:480 (2006) [13]</div>
            </div>
            <p class="protocol__body-text">
              The bandpass shape arises because at low frequencies both shells short-circuit
              (no voltage division across the nuclear membrane), and at high frequencies
              the outer membrane shields the interior. The peak is typically in the
              <strong>0.87–2.1 MHz</strong> range for the presets in this library.
              Cancer cells have a higher nuclear-to-cytoplasmic (N/C) ratio, thinner and
              more conductive nuclear envelopes, and lower nuclear V<sub>m</sub> thresholds —
              creating an additional cancer-selectivity axis. Enable this model via the
              <strong>Shell Model</strong> toggle in the Field Control panel (visible for
              nucleated mammalian presets only; hidden for bacteria, viruses, and RBC).
            </p>
            <div class="protocol__warn-box">
              <span class="protocol__warn-icon">⚠</span>
              <span>
                <strong>Thin-shell / sphere-in-infinite-medium approximation:</strong>
                The Kotnik &amp; Miklavcic (2006) double-shell model assumes the nuclear
                radius R<sub>nuc</sub> is small relative to the cell radius R (thin-shell,
                dilute-nucleus limit). For the adenocarcinoma preset,
                R<sub>nuc</sub>/R = 8/15 ≈ 0.53 — near the boundary of the approximation's
                validity (N/C ratio ≈ 0.28 by volume). At this N/C ratio the cytoplasmic
                volume is comparable to the nuclear volume, and the sphere-in-infinite-medium
                assumption underestimates the electric field concentration around the nuclear
                envelope by up to ~15%. The model remains a useful qualitative predictor of
                bandpass frequency and cancer/normal selectivity trends, but quantitative
                Vm<sub>nuc</sub> values for high N/C ratio cells should be interpreted
                with corresponding uncertainty.
              </span>
            </div>
            <table class="protocol__param-table">
              <thead>
                <tr><th>Cell</th><th>R<sub>nuc</sub> (µm)</th><th>d<sub>ne</sub> (nm)</th><th>σ<sub>ne</sub> (S/m)</th><th>V<sub>thr,nuc</sub> (V)</th><th>f<sub>peak</sub> (saline)</th></tr>
              </thead>
              <tbody>
                <tr><td>Hepatocyte</td><td class="protocol__mono">5.0</td><td class="protocol__mono">15</td><td class="protocol__mono">0.010</td><td class="protocol__mono">0.50</td><td class="protocol__mono protocol__primary-val">~1.66 MHz</td></tr>
                <tr><td>Adenocarcinoma</td><td class="protocol__mono">8.0</td><td class="protocol__mono">12</td><td class="protocol__mono">0.020</td><td class="protocol__mono protocol__cancer-val">0.40</td><td class="protocol__mono protocol__cancer-val">~0.87 MHz</td></tr>
                <tr><td>GBM</td><td class="protocol__mono">7.0</td><td class="protocol__mono">11</td><td class="protocol__mono">0.020</td><td class="protocol__mono protocol__cancer-val">0.35</td><td class="protocol__mono protocol__cancer-val">~1.05 MHz</td></tr>
                <tr><td>MCF-7</td><td class="protocol__mono">6.0</td><td class="protocol__mono">13</td><td class="protocol__mono">0.015</td><td class="protocol__mono protocol__cancer-val">0.42</td><td class="protocol__mono protocol__cancer-val">~1.28 MHz</td></tr>
                <tr><td>HL-60</td><td class="protocol__mono">4.0</td><td class="protocol__mono">14</td><td class="protocol__mono">0.015</td><td class="protocol__mono protocol__cancer-val">0.45</td><td class="protocol__mono protocol__cancer-val">~2.12 MHz</td></tr>
                <tr><td>RBC</td><td class="protocol__mono protocol__muted">—</td><td class="protocol__mono protocol__muted">—</td><td class="protocol__mono protocol__muted">—</td><td class="protocol__mono protocol__muted">—</td><td class="protocol__mono protocol__muted">Anucleate — not applicable</td></tr>
              </tbody>
            </table>

          <!-- 3. Step-by-step protocol -->
          <section id="protocol" class="protocol__section">
            <h2 class="protocol__section-title">3. Experimental Protocol</h2>
            <ol class="protocol__steps">
              <li class="protocol__step">
                <div class="protocol__step-num">01</div>
                <div class="protocol__step-body">
                  <div class="protocol__step-title">Select target cell type</div>
                  <p class="protocol__step-desc">
                    In the Experiment Lab, use the Target preset pills in the Selectivity Panel
                    to choose the pathogen of interest (cancer, bacteria, or virus). Each preset
                    loads biophysical parameters from the cell library (see Data Sets tab).
                    Alternatively, open the Cell Parameters panel on the target card to enter
                    custom values.
                  </p>
                </div>
              </li>
              <li class="protocol__step">
                <div class="protocol__step-num">02</div>
                <div class="protocol__step-body">
                  <div class="protocol__step-title">Set propagation medium</div>
                  <p class="protocol__step-desc">
                    Choose the extracellular medium (Saline, Blood, Tissue, or Water) using the
                    radio pills in the Field Control panel. The medium conductivity σ<sub>e</sub>
                    directly modifies τ for all cells, shifting f<sub>c</sub> markers on the chart
                    and scaling V<sub>m</sub>. Physiological saline (σ<sub>e</sub> = 1.5 S/m) is
                    the standard reference medium for in vitro experiments.
                  </p>
                </div>
              </li>
              <li class="protocol__step">
                <div class="protocol__step-num">03</div>
                <div class="protocol__step-body">
                  <div class="protocol__step-title">Establish baseline at sub-threshold field</div>
                  <p class="protocol__step-desc">
                    Begin with the default field intensity of 150 V/cm. Both cells should display
                    disruption ratios well below 50%. Click <em>Log Reading</em> in the Experiment
                    Log panel to record the baseline state. This first manual entry anchors the
                    session dataset.
                  </p>
                </div>
              </li>
              <li class="protocol__step">
                <div class="protocol__step-num">04</div>
                <div class="protocol__step-body">
                  <div class="protocol__step-title">Identify the optimal frequency window</div>
                  <p class="protocol__step-desc">
                    <strong>Cancer targets (IRE / Schwan mode):</strong> On the Transmembrane Potential
                    Response chart, the golden ⭐ marker shows the optimal broadcast frequency.
                    For cancer vs. normal cell pairs, selectivity is maximised in the quasi-DC regime
                    (f ≪ f<sub>c</sub>(T)), where V<sub>m</sub> selectivity = R<sub>T</sub>/R<sub>H</sub>.
                    The f<sub>c</sub> markers show where each cell's V<sub>m</sub> begins to roll off.
                  </p>
                  <p class="protocol__step-desc protocol__step-desc--spaced">
                    <strong>Bacteria / virus targets (Resonance mode):</strong> Switch to
                    <em>Resonance mode</em> using the toggle in the session bar. The platform
                    auto-tunes frequency to f<sub>res</sub> and sets field to 50% of E<sub>thr</sub>
                    when loading a resonance-enabled preset. The Lorentzian disruption curve peaks
                    at f<sub>res</sub> — tune frequency to this value for maximum disruption.
                    Click the ⭐ in the Selectivity Panel to snap to f<sub>res</sub> instantly.
                  </p>
                </div>
              </li>
              <li class="protocol__step">
                <div class="protocol__step-num">05</div>
                <div class="protocol__step-body">
                  <div class="protocol__step-title">Sweep frequency for maximum selectivity</div>
                  <p class="protocol__step-desc">
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
              <li class="protocol__step">
                <div class="protocol__step-num">06</div>
                <div class="protocol__step-body">
                  <div class="protocol__step-title">Increase field intensity toward target threshold</div>
                  <p class="protocol__step-desc">
                    Raise the Field Intensity slider incrementally. Monitor the Target disruption
                    ratio on the CellCard and Selectivity Panel progress bars. For adenocarcinoma
                    vs. hepatocyte in saline at 100 kHz (quasi-DC), lysis occurs near ~311 V/cm for the cancer
                    cell while the healthy cell remains below 50% disruption. Log readings at each
                    significant threshold crossing.
                  </p>
                </div>
              </li>
              <li class="protocol__step">
                <div class="protocol__step-num">07</div>
                <div class="protocol__step-body">
                  <div class="protocol__step-title">Record lysis event and review temperature</div>
                  <p class="protocol__step-desc">
                    When target cell lysis occurs, an entry is automatically added to the Experiment
                    Log with event type <em>lysis</em>. Check the temperature readout on both cell
                    cards. If temperature approaches 42 °C, consider reducing the field intensity
                    or switching to a lower-conductivity medium to reduce SAR.
                  </p>
                </div>
              </li>
              <li class="protocol__step">
                <div class="protocol__step-num">08</div>
                <div class="protocol__step-body">
                  <div class="protocol__step-title">Change cell preset and repeat parametric study</div>
                  <p class="protocol__step-desc">
                    Switch to a different target preset (e.g. GBM, MCF-7, E. coli) and repeat
                    steps 4–7. Compare selectivity ratios, f<sub>c</sub> positions, and lysis
                    thresholds across cell types. Use the Cell Parameters panel to perform
                    sensitivity analysis around published values.
                  </p>
                </div>
              </li>
              <li class="protocol__step">
                <div class="protocol__step-num">09</div>
                <div class="protocol__step-body">
                  <div class="protocol__step-title">Export session data for analysis</div>
                  <p class="protocol__step-desc">
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
          <section id="safety" class="protocol__section">
            <h2 class="protocol__section-title">4. Safety &amp; Thresholds</h2>
            <p class="protocol__body-text">
              The following reference thresholds are used in the simulation and are based on
              published bioelectromagnetics literature.
            </p>
            <table class="protocol__param-table">
              <thead>
                <tr><th>Parameter</th><th>Value</th><th>Significance</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td>V<sub>m,thr</sub> cancer cells</td>
                  <td class="protocol__mono protocol__cancer-val">0.65–0.85 V</td>
                  <td>Electroporation threshold; irreversible membrane disruption</td>
                </tr>
                <tr>
                  <td>V<sub>m,thr</sub> healthy tissue</td>
                  <td class="protocol__mono protocol__ref-val">1.0–1.1 V</td>
                  <td>Normal epithelial / hepatocyte electroporation threshold</td>
                </tr>
                <tr>
                  <td>V<sub>m,thr</sub> bacteria</td>
                  <td class="protocol__mono protocol__warn-val">1.5–2.0 V</td>
                  <td>Higher due to cell wall reinforcement (peptidoglycan)</td>
                </tr>
                <tr>
                  <td>Hyperthermic onset</td>
                  <td class="protocol__mono protocol__warn-val">42 °C</td>
                  <td>Sustained thermal damage onset; cancer cells more susceptible than normal tissue (IAHT threshold)</td>
                </tr>
                <tr>
                  <td>IEC 60601-2-33 SAR limit</td>
                  <td class="protocol__mono protocol__warn-val">4 W/kg</td>
                  <td>Regulatory whole-body average SAR limit for MRI equipment (IEC 60601-2-33); used here as a reference upper bound for pulsed RF</td>
                </tr>
                <tr>
                  <td>IEEE C95.1 SAR limit</td>
                  <td class="protocol__mono protocol__warn-val">1.6 W/kg</td>
                  <td>FCC/IEEE partial-body SAR limit (1 g tissue average)</td>
                </tr>
                <tr>
                  <td>Lysis hold time</td>
                  <td class="protocol__mono protocol__mono">2.5 s</td>
                  <td>Duration Disruption Ratio must exceed 1.0 before lysis event fires</td>
                </tr>
                <tr>
                  <td>IRE / electroporation field range</td>
                  <td class="protocol__mono protocol__primary-val">100–1000 V/cm</td>
                  <td>Sub-ablative to ablative IRE range (Davalos et al. [4]). Note: TTFields (Kirson et al. [2]) use ~1–3 V/cm via mitotic spindle disruption — a distinct, non-V<sub>m</sub>-threshold mechanism not modelled here</td>
                </tr>
                <tr>
                  <td>Acoustic resonance — Influenza A</td>
                  <td class="protocol__mono protocol__primary-val">f<sub>res</sub> ≈ 12 GHz · E<sub>thr</sub> = 800 V/cm</td>
                  <td>Capsid disruption threshold at resonance. Mammalian cells unaffected (no GHz resonance). Ref: Tsen et al. [10]</td>
                </tr>
                <tr>
                  <td>Acoustic resonance — SARS-CoV-2</td>
                  <td class="protocol__mono protocol__primary-val">f<sub>res</sub> ≈ 10 GHz · E<sub>thr</sub> = 1000 V/cm</td>
                  <td>Spike-protein envelope resonance; larger effective radius vs. Influenza. Ref: Tsen et al. [10]</td>
                </tr>
                <tr>
                  <td>Acoustic resonance — E. coli</td>
                  <td class="protocol__mono protocol__warn-val">f<sub>res</sub> ≈ 0.5 GHz · E<sub>thr</sub> = 2000 V/cm</td>
                  <td>Peptidoglycan cell-wall resonance. Higher E<sub>thr</sub> than viruses due to larger mass. Ref: Dykeman &amp; Sankey (2010) [11]</td>
                </tr>
                <tr>
                  <td>GHz field SAR caution</td>
                  <td class="protocol__mono protocol__warn-val">Duty cycle ≤ 0.001%</td>
                  <td>At GHz and >500 V/cm, use ultra-low duty cycle (pulsed mode) to prevent bulk heating. SAR model remains valid — monitor thermal readout.</td>
                </tr>
              </tbody>
            </table>
          </section>

          <!-- 5. References -->
          <section id="refs" class="protocol__section">
            <h2 class="protocol__section-title">5. References</h2>
            <ol class="protocol__refs-list">
              <li class="protocol__ref-item">
                <span class="protocol__ref-num">[1]</span>
                <span class="protocol__ref-body">
                  Schwan HP. <em>Electrical properties of tissue and cell suspensions.</em>
                  Advances in Biological and Medical Physics. 1957;5:147–209.
                  doi:10.1016/B978-1-4832-3111-2.50008-0
                </span>
              </li>
              <li class="protocol__ref-item">
                <span class="protocol__ref-num">[2]</span>
                <span class="protocol__ref-body">
                  Kirson ED, Dbaly V, Tovarys F, et al.
                  <em>Alternating electric fields arrest cell proliferation in animal tumor
                  models and human brain tumors.</em>
                  Proceedings of the National Academy of Sciences. 2007;104(24):10152–10157.
                  doi:10.1073/pnas.0702916104
                </span>
              </li>
              <li class="protocol__ref-item">
                <span class="protocol__ref-num">[3]</span>
                <span class="protocol__ref-body">
                  Weaver JC, Chizmadzhev YA.
                  <em>Theory of electroporation: a review.</em>
                  Bioelectrochemistry and Bioenergetics. 1996;41(2):135–160.
                  doi:10.1016/S0302-4598(96)05062-3
                </span>
              </li>
              <li class="protocol__ref-item">
                <span class="protocol__ref-num">[4]</span>
                <span class="protocol__ref-body">
                  Davalos RV, Mir LM, Rubinsky B.
                  <em>Tissue ablation with irreversible electroporation.</em>
                  Annals of Biomedical Engineering. 2005;33(2):223–231.
                  doi:10.1007/s10439-005-8981-8
                </span>
              </li>
              <li class="protocol__ref-item">
                <span class="protocol__ref-num">[5]</span>
                <span class="protocol__ref-body">
                  Foster KR, Schwan HP.
                  <em>Dielectric properties of tissues and biological materials: a critical review.</em>
                  Critical Reviews in Biomedical Engineering. 1989;17(1):25–104.
                  PMID:2651001
                </span>
              </li>
              <li class="protocol__ref-item">
                <span class="protocol__ref-num">[6]</span>
                <span class="protocol__ref-body">
                  Dimova R, Riske KA, Aranda S, et al.
                  <em>Giant vesicles in electric fields.</em>
                  Soft Matter. 2007;3(7):817–827.
                  doi:10.1039/B703580B
                </span>
              </li>
              <li class="protocol__ref-item">
                <span class="protocol__ref-num">[7]</span>
                <span class="protocol__ref-body">
                  Neumann E, Schaefer-Ridder M, Wang Y, Hofschneider PH.
                  <em>Gene transfer into mouse lyoma cells by electroporation in high electric fields.</em>
                  EMBO Journal. 1982;1(7):841–845.
                  doi:10.1002/j.1460-2075.1982.tb01257.x
                </span>
              </li>
              <li class="protocol__ref-item">
                <span class="protocol__ref-num">[8]</span>
                <span class="protocol__ref-body">
                  Stacey M, Stickley J, Fox P, et al.
                  <em>Differential effects in cells exposed to ultra-short, high intensity
                  electric fields: cell survival, DNA damage, and cell cycle analysis.</em>
                  Mutation Research. 2003;542(1–2):65–75.
                  doi:10.1016/j.mrgentox.2003.08.006
                </span>
              </li>
              <li class="protocol__ref-item">
                <span class="protocol__ref-num">[9]</span>
                <span class="protocol__ref-body">
                  Kotnik T, Miklavcic D.
                  <em>Analytical description of transmembrane voltage induced by electric fields on
                  spheroidal cells.</em>
                  Biophysical Journal. 2000;79(2):670–679.
                  doi:10.1016/S0006-3495(00)76325-9
                  <span class="protocol__ref-note">[Source of the corrected τ = R·C<sub>m</sub>·(2σ<sub>e</sub>+σ<sub>i</sub>)/(2σ<sub>e</sub>·σ<sub>i</sub>) formula used in this simulator]</span>
                </span>
              </li>
              <li class="protocol__ref-item">
                <span class="protocol__ref-num">[10]</span>
                <span class="protocol__ref-body">
                  Tsen SW, Wu TC, Kiang JG, Tsen KT.
                  <em>Prospects for a novel ultrashort pulsed laser technology for pathogen inactivation.</em>
                  Journal of Biomedical Science. 2012;19:1–8.
                  doi:10.1186/1423-0127-19-62
                  <span class="protocol__ref-note">[Review consolidating 2007–2012 experimental data on acoustic resonance disruption of viral capsids; f<sub>res</sub> and E<sub>thr</sub> values for Influenza A and SARS-CoV-2 used in this simulator]</span>
                </span>
              </li>
              <li class="protocol__ref-item">
                <span class="protocol__ref-num">[11]</span>
                <span class="protocol__ref-body">
                  Dykeman EC, Sankey OF.
                  <em>Atomistic modeling of the low-frequency mechanical modes and Raman spectra of icosahedral virus capsids.</em>
                  Physical Review E. 2010;81:021918.
                  doi:10.1103/PhysRevE.81.021918
                  <span class="protocol__ref-note">[Lorentzian resonance lineshape model; Q-factor basis for capsid disruption simulation]</span>
                </span>
              </li>
              <li class="protocol__ref-item">
                <span class="protocol__ref-num">[12]</span>
                <span class="protocol__ref-body">
                  Schoenbach KH, Beebe SJ, Buescher ES.
                  <em>Intracellular effect of ultrashort electrical pulses.</em>
                  Bioelectromagnetics. 2001;22(6):440–448.
                  doi:10.1002/bem.71
                  <span class="protocol__ref-note">[Foundational nsEP paper; pulse step-response charging of membranes with t<sub>p</sub> ≪ τ; basis for nsEP selectivity model in Section 2.5]</span>
                </span>
              </li>
              <li class="protocol__ref-item">
                <span class="protocol__ref-num">[13]</span>
                <span class="protocol__ref-body">
                  Kotnik T, Miklavcic D.
                  <em>Theoretical evaluation of voltage inducement on internal membranes of biological cells exposed to electric fields.</em>
                  Biophysical Journal. 2006;90(2):480–491.
                  doi:10.1529/biophysj.105.070771
                  <span class="protocol__ref-note">[Double-shell nuclear envelope model; two-pole bandpass formula for nuclear membrane Vm; f<sub>peak</sub> and nuclear Vm values used in Section 2.6 and the "+ Nuclear Envelope" toggle]</span>
                </span>
              </li>
            </ol>
          </section>

        </article>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
/* ── Page shell ───────────────────────────────────────────────────────────── */
.protocol {
  flex: 1;
  overflow-y: auto;
  background-color: var(--color-bg);

  &__inner {
    max-width: 1600px;
    margin: 0 auto;
    padding: 2rem 2rem 4rem;
  }

  /* ── Page header ──────────────────────────────────────────────────────────── */
  &__header {
    margin-bottom: 2.5rem;
  }

  &__eyebrow {
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
  }

  /* ── Two-column layout ────────────────────────────────────────────────────── */
  &__layout {
    display: grid;
    grid-template-columns: 220px minmax(0, 1fr);
    gap: 2.5rem;
    align-items: start;
  }

  /* ── TOC ──────────────────────────────────────────────────────────────────── */
  &__toc {
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

  &__toc-title {
    font-size: 0.65rem;
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--color-text-muted);
    margin-bottom: 0.65rem;
  }

  &__toc-link {
    font-size: 0.8rem;
    color: var(--color-text-muted);
    text-decoration: none;
    padding: 0.3rem 0.5rem;
    border-radius: 4px;
    transition: color 0.15s, background-color 0.15s;
    line-height: 1.4;

    &:hover {
      color: var(--color-primary);
      background-color: var(--color-primary-dim);
    }
  }

  &__toc-indent {
    padding-left: 1.1rem;
    font-size: 0.75rem;
  }

  /* ── Article ──────────────────────────────────────────────────────────────── */
  &__doc {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  &__section {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: 2rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  &__section-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--color-text-heading);
    margin: 0;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--color-border);
  }

  &__subsection-title {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--color-primary);
    margin: 0.5rem 0 0;
    font-family: var(--font-mono);
    letter-spacing: 0.03em;
  }

  &__body-text {
    font-size: 0.9rem;
    color: var(--color-text);
    line-height: 1.8;
    margin: 0;

    strong { color: var(--color-text-heading); }
  }

  /* ── Info box ─────────────────────────────────────────────────────────────── */
  &__info-box {
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

  &__info-icon {
    color: var(--color-primary);
    font-weight: 700;
    flex-shrink: 0;
    margin-top: 0.05rem;
  }

  /* ── Warn box ─────────────────────────────────────────────────────────────── */
  &__warn-box {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    background: rgba(251, 191, 36, 0.06);
    border: 1px solid rgba(251, 191, 36, 0.3);
    border-radius: var(--radius);
    padding: 0.85rem 1rem;
    font-size: 0.82rem;
    color: var(--color-text-muted);
    line-height: 1.6;
  }

  &__warn-icon {
    color: var(--color-amber);
    font-weight: 700;
    flex-shrink: 0;
    margin-top: 0.05rem;
  }

  /* ── Equation blocks ──────────────────────────────────────────────────────── */
  &__eq-block {
    background: var(--color-surface-2, #0a1628);
    border: 1px solid var(--color-border);
    border-left: 3px solid var(--color-primary);
    border-radius: var(--radius);
    padding: 1.25rem 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  &__eq-main {
    font-size: 1rem;
    font-family: var(--font-mono);
    color: var(--color-text-heading);
    letter-spacing: 0.04em;
  }

  &__eq-sub {
    font-size: 0.78rem;
    font-family: var(--font-mono);
    color: var(--color-text-muted);
  }

  &__eq-divider {
    height: 1px;
    background: var(--color-border);
    margin: 0.25rem 0;
  }

  &__eq-note {
    font-size: 0.68rem;
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    opacity: 0.6;
    margin-top: 0.15rem;
  }

  &__eq-note-sub {
    font-size: 0.68rem;
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    opacity: 0.6;
    margin-top: 0.15rem;
  }

  /* ── Parameter table ──────────────────────────────────────────────────────── */
  &__param-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.82rem;

    th {
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

    td {
      padding: 0.6rem 0.75rem;
      color: var(--color-text);
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      line-height: 1.5;
    }

    tr:last-child td { border-bottom: none; }
    tr:hover td { background: rgba(255, 255, 255, 0.025); }
  }

  &__mono        { font-family: var(--font-mono); font-size: 0.8rem; }
  &__cancer-val  { color: var(--color-danger);  }
  &__ref-val     { color: var(--color-primary); }
  &__warn-val    { color: var(--color-amber);   }
  &__muted       { color: var(--color-text-muted); }
  &__primary-val { color: var(--color-primary); }

  /* ── Protocol steps ───────────────────────────────────────────────────────── */
  &__steps {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  &__step {
    display: flex;
    gap: 1.25rem;
    padding: 1.1rem 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);

    &:last-child { border-bottom: none; }
  }

  &__step-num {
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

  &__step-body {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  &__step-title {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--color-text-heading);
  }

  &__step-desc {
    font-size: 0.85rem;
    color: var(--color-text-muted);
    line-height: 1.7;
    margin: 0;

    em {
      color: var(--color-primary);
      font-style: normal;
    }

    &--spaced { margin-top: 0.5rem; }
  }

  /* ── References ───────────────────────────────────────────────────────────── */
  &__refs-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  &__ref-item {
    display: flex;
    gap: 0.75rem;
    padding: 0.9rem 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);

    &:last-child { border-bottom: none; }
  }

  &__ref-num {
    font-size: 0.75rem;
    font-family: var(--font-mono);
    color: var(--color-primary);
    flex-shrink: 0;
    width: 2.25rem;
    padding-top: 0.05rem;
  }

  &__ref-body {
    font-size: 0.82rem;
    color: var(--color-text-muted);
    line-height: 1.7;

    em {
      color: var(--color-text);
      font-style: italic;
    }
  }

  &__ref-note {
    display: block;
    font-size: 0.72rem;
    color: var(--color-primary);
    opacity: 0.7;
    margin-top: 0.15rem;
    font-family: var(--font-mono);
  }
}

/* ── Responsive ───────────────────────────────────────────────────────────── */
@media (max-width: 900px) {
  .protocol__layout {
    grid-template-columns: 1fr;
  }
  .protocol__toc {
    position: static;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 0.25rem;
  }
  .protocol__toc-title { width: 100%; }
  .protocol__toc-link  { font-size: 0.75rem; }
}

@media (max-width: 600px) {
  .protocol__inner   { padding: 1rem 1rem 3rem; }
  .protocol__section { padding: 1.25rem; }
}
</style>
