# Scientific Rigour

- PhD-level accuracy — verify formulas before documenting claims
- Never round or approximate constants in code — full precision, named identifier in `constants/physics.ts`

## Membrane Voltage — Schwan Equation
*Kotnik & Miklavcic 2000*

```
Vm(f) = 1.5 · E · R · cosθ / √(1 + (ω·τ)²)
τ     = R · Cm · (2σ_e + σ_i) / (2σ_e · σ_i)
Cm    = ε_r · ε₀ / d_mem
fc    = 1 / (2π·τ)
```

- `cosθ = 1` at field-aligned pole; expose as `orientationDeg` slider
- `σ_e(T) = σ_e0 × (1 + 0.02 × (T − 37))` — temperature-corrected
- High-frequency selectivity limit: `sel(f≫fc) = (R_T·τ_H)/(R_H·τ_T)` — can be sub-unity
- Quasi-DC Vm is **independent of medium conductivity** (σ_e only affects τ and fc)

## SAR and Thermal Model
*Pennes 1948 bioheat; Newton cooling approximation*

```
α    = 3σ_e / (2σ_e + σ_i)          ← internal-field coupling
SAR  = σ_i · α² · E² · wf / ρ       ← wf = duty-cycle weighted factor
T_ss = 37 + SAR · dc / (λ · cp)     ← steady-state temperature rise
λ    = 0.02 s⁻¹                     ← Newton cooling rate constant
```

- `α` is **not** `(σ_e + σ_i) / 2` — that form is wrong
- Waveform factor `wf`: CW = 0.5 (sinusoidal, E²_rms = E²_peak/2); pulsed = 1.0 (square wave); duty cycle applied separately as `SAR_eff = SAR × dc` in T_ss

## Electroporation — Lysis and Pulse Envelope
*Weaver & Chizmadzhev 1996*

```
pulseEnvelopeFactor = 1 − exp(−t_p / τ)   ← fraction of RC charge reached
disruptionRatio     = Vm_eff / V_threshold
```

- Pulse envelope factor applies to IRE only; CW and resonance use factor = 1.0
- Reversible EP: 50–85% DR (transient, recoverable)
- Lysis (irreversible EP): DR > 85% sustained ≥ `lysisDelayMs`; delay = N_pulses × (t_p / dc)
- Lysis field and DEP crossover are independent — do not conflate

## Dielectrophoresis (DEP)
```
f_DEP_cross ≈ fc    ← approximate; exact value depends on medium vs cytoplasm ε and σ
```

- DEP chart mode shows force direction, not Vm — do not mix axes
- Bacteria/viruses: Schwan is approximate; rigid-shell assumption fails for soft membranes
- Bacteria Q factor: peptidoglycan viscoelastic damping → Q ≈ 3–4 (not 10–15)

## Biomodulation Scoring (SI / MTE / MA)
```
SI  = Stimulation Index                 ← sub-EP Vm vs nourishing threshold
MTE = Mechano-Transduction Efficiency   ← acoustic coupling at sub-lytic amplitude
MA  = Mild Thermal Activation           ← temperature in 37–41 °C window
biomodScore = weighted combination of SI, MTE, MA (0–1)
```

- Biomodulation is only meaningful at DR < 50%; above that, EP dominates
- `biomodScore ≥ 0.55` is the "nourishing" threshold for glow and score colour

## Model caveats to always preserve
- Mammalian cells have **no rigid-shell acoustic resonance** — Schwan Vm rolls off via `ωτ ≫ 1`, not resonance
- Virus/bacteria Schwan Vm is approximate; fc in GHz range is physically inaccessible with current hardware
- SAR heating assumes uniform field, neglects blood perfusion — valid for in-vitro approximation only
