# ResoPulse — Closed-Loop Electroporation Digital Twin

### *Precision Simulation for Selective Electroporation & Bioelectric Field Research*

**CONFIDENTIAL & PROPRIETARY** *This repository is for private research and evaluation only. All rights reserved.*

> **Legal:** By viewing or evaluating this codebase you agree to the [ResoPulse Terms of Use](https://www.resopulse-virtual-lab.com/terms).
> Unauthorised copying, cloning, or use of the physics engine to build competing software is strictly prohibited.
> © 2026 Tomer Preis. All rights reserved.

---

## Executive Summary

**ResoPulse** is a high-fidelity **virtual in-vitro laboratory** — a digital twin of a cuvette or well-plate electroporation experiment on single cells or cell suspensions. By simulating the full physics in a reactive virtual environment, researchers can identify the exact field parameters that lyse a target cell while leaving healthy cells below threshold, before touching any physical equipment.

The platform computes the transmembrane potential, SAR thermal budget, pulse-width membrane charging, and acoustic capsid disruption ratio in real time, and maps the selectivity window across the full frequency spectrum. A hardware bridge streams live impedance readings from a bench instrument directly into the UI, and an AI optimizer learns from accumulated experiment outcomes to refine protocol suggestions beyond the physics baseline.

---

## Core Physical Frameworks

### 1. Electroporation Regime (Mammalian)
- **Model:** Schwan single-shell (Kotnik & Miklavcic 2000)
- **Logic:** Frequency-dependent membrane charging (Vm) — identifies frequencies where target cells reach lysis threshold before reference cells
- **Selectivity:** Protocol window where target DR >= 85% while healthy baseline stays DR < 50%

### 2. Acoustic Resonance Regime (Virology & Bacteriology)
- **Model:** Lorentzian harmonic excitation — capsid or cell-wall mechanical disruption
- **Logic:** Frequency-selective disruption of sub-micron pathogens via protein shell or peptidoglycan resonance

### 3. Sub-threshold Biomodulation
- **Model:** PIEZO1 Ca2+ / NO stimulation index at DR < 50%
- **Logic:** Nourishing and stimulation window for membrane activation without electroporation

---

## Key Modules

### Experiment Lab
Real-time Schwan Vm, SAR thermal model, pulsed-IRE pulse-envelope factor, disruption ratio chart DR(f), cell population distribution, live animated cell canvas, and waveform controls (CW / pulsed / H-FIRE).

### Instrument Panel
Cuvette impedance tracking, Z-drift detection, corrected generator voltage, hardware bridge (Socket.IO), load monitor, and sonification via Web Audio API.

### AI Protocol Optimizer
ML-assisted protocol recommendation that blends physics baseline suggestions with XGBoost inference trained on accumulated experiment outcomes. Confidence grows as more outcomes are logged. See [Instrument Bridge: AI Service](#ai-optimizer-service) below.

### Session Reports
Full experiment log with cumulative absorbed dose (J/kg), selectivity timeline, and one-click CSV + Materials & Methods export.

### Cell Library
10 biologically-grounded presets: reference hepatocytes, 4 cancer lines, E. coli, MRSA, Influenza A, SARS-CoV-2 — with computed Cm, tau, and fc.

### Research Protocol
Schwan equation derivation, SAR model, pulse-envelope factor (Weaver & Chizmadzhev), electroporation thresholds, and peer-reviewed literature references.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vue 3 (Options API), Pinia, TypeScript, Vite, D3.js v7, vue-i18n |
| Backend | Node.js, Express, Socket.IO |
| Instrument Bridge | Python 3.11+, asyncio, python-socketio, Click, Rich, Pydantic |
| AI Service | FastAPI, Uvicorn, XGBoost, scikit-learn, NumPy, joblib |
| Physics | Custom TypeScript: Schwan equation, Pennes bioheat, Lorentzian resonance, nsEP pulse envelope |
| Deployment | Vercel (frontend), Render (backend + AI service), Neon (Postgres) |

---

## Installation

### Frontend + Backend

```bash
npm run install:all
npm run frontend    # Vite dev server  →  http://localhost:5173
npm run backend     # ts-node-dev      →  http://localhost:3001
```

### Instrument Bridge (Python)

The bridge streams impedance readings from a bench instrument to the backend over Socket.IO. It requires Python 3.11+ and [uv](https://github.com/astral-sh/uv).

```bash
cd apps/instrument-bridge
uv sync                      # base install (no hardware drivers)
uv sync --extra serial       # add PySerial for RS-232 instruments
uv sync --extra visa         # add PyVISA for GPIB/USB-TMC instruments
uv sync --extra all          # serial + visa

cp .env.example .env         # configure backend URL and driver settings
```

Run with a synthetic demo driver (no hardware required):

```bash
uv run instrument-bridge run --driver demo
```

Then open the ResoPulse UI, go to the Experiment view, enable Hardware Mode in the Load Monitor panel, and watch live impedance readings appear.

---

## Instrument Drivers

| Driver | Instrument | Interface |
|--------|-----------|-----------|
| `demo` | Synthetic sine-wave (no hardware) | n/a |
| `btx` | BTX ECM 830 / ECM 2001 electroporator | RS-232 serial |
| `ascii_serial` | DE-5000 and compatible LCR meters | RS-232 serial |
| `visa_lcr` | Keysight E4980A, Hioki IM3523, and any VISA LCR meter | GPIB, USB-TMC, or LAN |
| `nanopulse` | Pulse Biosciences NanoPulse | TCP/IP |
| `pulse_select` | Pulse Biosciences PulseSelect | TCP/IP |

### Example invocations

```bash
# BTX ECM 830 on Windows COM4
instrument-bridge run --driver btx --port COM4

# Keysight E4980A via GPIB address 17
instrument-bridge run --driver visa_lcr --visa-resource "GPIB0::17::INSTR"

# DE-5000 ASCII serial on Linux
instrument-bridge run --driver ascii_serial --port /dev/ttyUSB0

# Pulse Biosciences NanoPulse on local network
instrument-bridge run --driver nanopulse --pb-host 192.168.1.50

# Connect bridge to a remote ngrok backend
instrument-bridge run --driver demo --backend-url https://abc123.ngrok.io
```

### Bridge probe (detect instruments without starting the full bridge)

```bash
instrument-bridge probe --driver visa_lcr --visa-resource "USB0::0x0957::0x0909::MY12345::INSTR"
```

---

## AI Optimizer Service

The AI service is a FastAPI microservice in its own Python package (`apps/ai-service`), deployed independently from the instrument bridge. The Node.js backend calls it over HTTP to fetch protocol recommendations.

The service blends two sources:

1. **Physics baseline** (always available): the Schwan-equation optimal frequency computed by the frontend, passed through as-is with a 0.5 confidence score.
2. **XGBoost model** (activates after sufficient outcomes): trained on logged experiment outcomes (frequency, field, waveform, cell params, observed lysis fraction). Confidence grows linearly from 0.2 at the activation threshold to 0.8 at 5x the threshold, then plateaus.

### Start the AI service

```bash
cd apps/ai-service
uv sync
uv run resopulse-ai serve                               # localhost:8000
uv run resopulse-ai serve --host 0.0.0.0 --port 8000    # expose on LAN
uv run resopulse-ai serve --reload                      # dev mode with auto-reload
```

Set `AI_SERVICE_URL=http://localhost:8000` in the Node.js backend environment.

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service status, model readiness, training sample count |
| POST | `/ai/optimize` | Return optimized protocol recommendation |
| POST | `/ai/retrain` | Retrain XGBoost model from the SQLite outcomes database |

### Seed demo data (optional)

To pre-populate the outcomes database with synthetic training data so the ML model activates immediately:

```bash
uv run resopulse-ai seed-demo
```

Or set `DEMO_SEED=true` in the environment before starting `resopulse-ai serve` for automatic seeding on first launch.

---

## Testing

Tests live in `apps/web/src/**/*.test.ts` and run via Vitest.

```bash
npm test                         # frontend + backend
npm -w @resopulse/web run test:watch     # frontend watch mode
npm -w @resopulse/web run test:coverage  # frontend coverage report
```

127 tests across three files: physics unit tests (`physics.test.ts`, `physicsAdvanced.test.ts`) and store integration tests (`cellStore.test.ts`).

### CI / CD gates

| Gate | Trigger | Behaviour |
|------|---------|-----------|
| Pre-push hook | Every `git push` on this machine | Runs tests, aborts push if red |
| GitHub Actions | Every push and PR | Runs tests + build, shows pass/fail badge |
| Vercel deploy | Every deploy | Runs tests before build, cancels deploy if tests fail |

Activate the pre-push hook on a new clone:

```bash
git config core.hooksPath .githooks
```

---

## Legal Notice & Disclaimer

ResoPulse is a computational simulation tool intended for **in-vitro laboratory research only**. It is not a medical device. All biophysical parameters are approximations derived from the bioelectromagnetics literature. The developer assumes no liability for experimental outcomes or laboratory decisions based on these simulations.
