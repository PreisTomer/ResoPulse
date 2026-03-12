
# Bio-Resonance: Cellular Dielectric & Acoustic Simulator

### *Advanced Computational Modeling of Frequency-Selective Cellular Ablation*

## 🧬 Overview

The **BioResonance Platform** is a research-grade visualization tool for studying the effects of alternating electric fields and mechanical vibrations on biological membranes. By leveraging the **Schwan single-shell dielectric model** and **Acoustic Resonance theory**, the app simulates how specific frequencies can selectively disrupt cancer cells, bacteria, and viruses while sparing healthy tissue.

---

## 🔬 Core Physical Models

The application operates in two distinct physical regimes depending on the target:

### 1. The Electroporation Regime (Cancer & Mammalian Cells)

For cells in the **10 kHz – 500 MHz** range, the app calculates the **Induced Transmembrane Potential ($V_m$)** using the extended Schwan Equation:

$$V_m(f) = \frac{1.5 \cdot E \cdot R}{\sqrt{1 + (\omega\tau)^2}}$$

* **Selectivity Logic:** Larger cells (Cancer) have a longer time constant ($\tau$), resulting in a lower characteristic frequency ($f_c$). This creates a "Therapeutic Window" where cancer cells reach their lysis threshold ($V_{m,thr} \approx 0.65\text{--}0.85\text{V}$) before healthy cells ($V_{m,thr} \approx 1.1\text{V}$).
* **Thermal Safety:** Includes a **Specific Absorption Rate (SAR)** model with Newton cooling to monitor hyperthermic onset (>42°C).

### 2. The Resonance Regime (Viruses & Bacteria)

For sub-micron pathogens, where $V_m$ is negligible, the app switches to **Acoustic/Mechanical Resonance** modeling using a **Lorentzian lineshape**:

$$\text{Disruption Ratio} = \frac{E}{E_{thr}} \times \frac{1}{\sqrt{1 + (Q \cdot (f/f_0 - f_0/f))^2}}$$

* **Targeting:** Models the physical "ringing" and fracture of capsids (e.g., **SARS-CoV-2 at ~10 GHz** or **Influenza A at ~12 GHz**).
* **Selectivity:** Because mammalian cells resonate at ~100 kHz, they are physically "invisible" to the GHz frequencies used to destroy viruses.

---

## 🚀 App Structure & User Flow

### 🧪 [The Experiment Lab](https://www.google.com/search?q=/experiment)

The interactive "heart" of the app where users run live simulations.

* **Real-time Visualizer:** Observe membrane deformation and "ringing" effects.
* **Bode Chart:** View the $V_m$ roll-off and $f_c$ markers for target vs. reference cells.
* **Live Controls:** Adjust Field Intensity ($V/cm$), RF Frequency, and Pulse Width (ns).

### 📝 [Experimental Protocol](https://www.google.com/search?q=/protocol)

A comprehensive scientific guide (derived from Schwan 1957 and Kotnik 2000) that explains the math behind the simulation. It provides a step-by-step walkthrough for establishing baselines and identifying optimal frequency windows.

### 📊 [Reports & Analytics](https://www.google.com/search?q=/reports)

* **Automatic Event Logging:** Captures "Lysis Events" the moment the disruption ratio > 1.0 for 2.5s.
* **Data Export:** Export session logs as structured CSVs for external analysis.

---

## 🛠 Technical Details

* **Primary Logic:** Frequency-dependent membrane response modeling.
* **Key Targets:** * **Cancer:** Adenocarcinoma, Glioblastoma (GBM), MCF-7.
* **Pathogens:** SARS-CoV-2, Influenza A, E. coli, MRSA.


* **Waveforms:** Continuous Wave (CW) Sinusoidal and Nanosecond Pulsed DC (nsEP).

---

## 📚 References & Bibliography

The simulator is anchored in peer-reviewed literature, including:

* **Schwan (1957):** Dielectric properties of cell suspensions.
* **Kotnik & Miklavcic (2000):** Analytical description of $V_m$ on spheroidal cells.
* **Tsen et al. (2007/2010):** Virus inactivation via GHz resonance.
* **Davalos et al. (2005):** Irreversible Electroporation (IRE) thresholds.

---

## 💻 Installation & Dev

```bash
git clone https://github.com/[your-username]/bio-resonance.git
npm install
npm run dev

```
