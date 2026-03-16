# ResoPulse — Virtual Biophysics Engine

### *Precision Simulation for Selective Electroporation & Bioelectric Field Research*

**⚠️ CONFIDENTIAL & PROPRIETARY** *This repository is for private research and evaluation only. All rights reserved.*

> **Legal:** By viewing or evaluating this codebase you agree to the [ResoPulse Terms of Use](https://bio-resonance.vercel.app/terms).
> Unauthorised copying, cloning, or use of the physics engine to build competing software is strictly prohibited.
> © 2026 Tomer Preis. All rights reserved.

---

## 🧬 Executive Summary

**ResoPulse** is a high-fidelity **Virtual Biophysics Engine** for planning and executing frequency-selective cellular electroporation experiments. By simulating the full physics in a reactive virtual environment, researchers can identify the exact field parameters that lyse a target cell while leaving healthy tissue below threshold — before touching a cuvette.

The platform computes the transmembrane potential, SAR thermal budget, pulse-width membrane charging, and acoustic capsid disruption ratio in real time, and maps the therapeutic window across the full frequency spectrum.

---

## 🔬 Core Physical Frameworks

### 1. Electroporation Regime (Mammalian Oncology)
* **Model:** Schwan single-shell & Kotnik-Miklavcic double-shell.
* **Logic:** Frequency-dependent membrane charging (Vm) — identifies frequencies where cancer cells reach lysis threshold before healthy cells.
* **Selectivity:** Therapeutic window where larger/higher-ε targets reach DR ≥ 85% while healthy baseline stays DR < 50%.

### 2. Acoustic Resonance Regime (Virology & Bacteriology)
* **Model:** Lorentzian harmonic excitation — capsid / cell-wall mechanical disruption.
* **Logic:** Frequency-selective disruption of sub-micron pathogens via protein shell or peptidoglycan resonance.

### 3. Sub-threshold Biomodulation
* **Model:** PIEZO1 Ca²⁺ / NO stimulation index at DR < 50%.
* **Logic:** Nourishing / stimulation window for membrane activation without electroporation.

---

## 🚀 Key Modules

### 🧪 Experiment Lab
Real-time Schwan Vm, SAR thermal model, pulsed-IRE pulse-envelope factor, disruption ratio chart DR(f), cell population distribution, and live animated cell canvas — all in one workspace.

### 🎛️ Instrument Panel
Cuvette impedance tracking, Z-drift detection, corrected generator voltage, hardware bridge (Socket.IO), and sonification via Web Audio API.

### 📊 Session Reports
Full experiment log with cumulative absorbed dose (J/kg), selectivity timeline, and one-click CSV + Materials & Methods export.

### 📚 Cell Library
10 biologically-grounded presets: reference hepatocytes, 4 cancer lines, E. coli, MRSA, Influenza A, SARS-CoV-2 — with computed Cm, τ, and fc.

### 📖 Research Protocol
Schwan equation derivation, SAR model, pulse-envelope factor (Weaver & Chizmadzhev), electroporation thresholds, and 8 peer-reviewed literature references.

---

## 🛠 Tech Stack

* **Frontend:** Vue 3 (Options API) · Pinia · TypeScript · Vite · D3.js v7 · vue-i18n
* **Backend:** Node.js · Express · Socket.IO
* **Physics:** Custom TypeScript — Schwan equation, Pennes bioheat, Lorentzian resonance, nsEP pulse envelope
* **Deployment:** Vercel (frontend) · Railway (backend)

---

## 🏁 Installation

```bash
npm run install:all
npm run frontend    # Vite dev server
npm run backend     # ts-node-dev
```

---

## ⚖️ Legal Notice & Disclaimer

ResoPulse is a computational simulation tool intended for **in-vitro laboratory research only**. It is not a medical device. All biophysical parameters are approximations derived from the bioelectromagnetics literature. The developer assumes no liability for experimental outcomes or laboratory decisions based on these simulations.
