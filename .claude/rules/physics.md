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
*Lumped 0-D thermal balance with Pennes-style perfusion sink (NOT the full Pennes PDE)*

```
α    = 3σ_e / (2σ_e + σ_i)          ← internal-field coupling
SAR  = σ_i · α² · E² · wf / ρ       ← wf = duty-cycle weighted factor
T_ss = T_amb + SAR · dc / (λ · cp)  ← steady-state temperature (closed-form lumped)
T(t) = T_amb + (T_ss − T_amb)·(1 − e^(−λt)) + (T₀ − T_amb)·e^(−λt)   ← transient ramp
λ    = U·A / (ρ·V·cp) (default 0.02 s⁻¹ for BTX 1mm cuvette)
```

- `α` is **not** `(σ_e + σ_i) / 2` — that form is wrong
- Waveform factor `wf`: CW = 0.5 (sinusoidal, E²_rms = E²_peak/2); pulsed = 1.0 (square wave); duty cycle applied separately as `SAR_eff = SAR × dc` in T_ss
- The model is a 0-D well-mixed-cuvette approximation, valid for in-vitro only. The full Pennes PDE (with k∇²T spatial conduction and metabolic heat source) is out of scope per `lab-context.md`. Always label as "Pennes-style" or "lumped thermal balance" in user-visible text — never bare "Pennes" without that qualifier
- `newtonCoolingLambda(A_cm², V_mL, U, ρ, cp)` derives λ from cuvette geometry; pass a custom λ to `computeTemperatureRamp` to override the default for a non-BTX cuvette

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
