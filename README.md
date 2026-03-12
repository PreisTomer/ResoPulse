# BioResonance: Biophysical Control & Digital Twin Interface

### *Precision Modeling for Targeted Electro-Physiology and Mechanical Lysis*

[![Scientific Validity](https://img.shields.io/badge/Physics-Schwan_%26_Lorentzian-blue.svg)](https://bio-resonance.vercel.app/protocol)
[![Research Grade](https://img.shields.io/badge/Status-Proof--of--Concept-orange.svg)](https://bio-resonance.vercel.app/experiment)

---

## 🧬 Executive Summary

**BioResonance** is a research-grade visualization tool and computational dashboard designed for studying the effects of alternating electric fields and mechanical vibrations on biological membranes. By creating a **Digital Twin** of cellular environments, the platform allows researchers to visualize, predict, and automate cellular responses to specific frequency parameters. 

The platform is architected as a modern GUI for high-frequency cellular research, leveraging validated physical models to bridge the gap between theoretical biophysics and laboratory experimentation.

---

## 🔬 Core Physical Frameworks

The engine utilizes two primary physical regimes to calculate cellular stress and targeting thresholds in real-time:

### 1. The Electroporation Regime (Cancer & Mammalian Cells)
Designed for determining the **Induced Transmembrane Potential ($V_m$)** using the **Schwan Equation**:
* **Plasma Membrane Logic**: Calculates frequency-dependent membrane charging in the $10\text{ kHz}$ to $500\text{ MHz}$ range.
* **Nuclear Envelope Targeting**: Implements the **Kotnik & Miklavcic (2006) double-shell model** to identify frequencies that bypass the plasma membrane to target the nucleus directly.
* **Selectivity**: Identifies the **Therapeutic Window** where larger cancer cells reach lysis thresholds (typically $0.65\text{--}0.85\text{V}$) before healthy cells ($1.1\text{V}$).

### 2. The Resonance Regime (Viruses & Bacteria)
For sub-micron pathogens where $V_m$ is negligible, the system shifts to **Acoustic/Mechanical Resonance** modeling:
* **Lorentzian Lineshape**: Models the physical "ringing" and fracture of capsids based on stiffness and geometry.
* **Targeting Examples**: Includes specific resonant frequencies for pathogens such as **SARS-CoV-2 (~10 GHz)** and **Influenza A (~12 GHz)**.
* **Mechanical Selectivity**: Since mammalian cells resonate at lower frequencies (~100 kHz), they remain physically unaffected by GHz-range pathogen targeting.

---

## 🚀 Key Modules

### 🧪 [The Experiment Lab](https://bio-resonance.vercel.app/experiment)
* **Real-Time Visualizer**: Observe membrane deformation, "ringing" effects, and thermal shifts driven by the physics engine.
* **Bode Charting**: View $V_m$ roll-off and characteristic frequency ($f_c$) markers for target vs. reference cells.
* **Live Controls**: Interactive adjustment of Field Intensity ($V/cm$), RF Frequency, and Pulse Width (ns).

### 📜 [Experimental Protocol](https://bio-resonance.vercel.app/protocol)
* **Mathematical Foundations**: Provides a comprehensive guide to the Schwan and Lorentzian models used in the simulation.
* **Step-by-Step Lab Guide**: Walkthroughs for establishing baselines and identifying optimal frequency windows.
* **Literature Anchors**: Database of dielectric and mechanical constants derived from peer-reviewed research.

### 🎛️ [Instrument Panel](https://bio-resonance.vercel.app/instrument)
* **Waveform Modulation**: Toggle between Continuous Wave (CW) Sinusoidal and Nanosecond Pulsed DC (nsEP).
* **Hardware Readiness**: Designed to interface with function generators to automate frequency-sweep experiments.

---

## 📊 Advanced Research Features

* **Frequency-Response Heatmaps**: A 2D "Kill Zone" finder mapping Frequency $\times$ Field Strength to identify the optimal therapeutic window.
* **Dosimetry Logging**: Automatically calculates **Specific Absorption Rate (SAR)** and total energy fluence ($J/kg$) delivered during a session.
* **Data Export**: Export structured session logs as CSVs for external statistical analysis and peer-review preparation.

---

## 📚 References & Bibliography

The **BioResonance** engine is anchored in foundational biophysics literature:
* **Schwan (1957)**: Dielectric properties of biological tissues.
* **Kotnik & Miklavcic (2000/2006)**: Analytical descriptions of $V_m$ and multi-shell models.
* **Tsen et al. (2007/2010)**: Virus inactivation via GHz mechanical resonance.
* **Davalos et al. (2005)**: Irreversible Electroporation (IRE) thresholds.

---

## 🏁 Installation

```bash
git clone [https://github.com/your-username/bio-resonance.git](https://github.com/your-username/bio-resonance.git)
npm install
npm run dev
