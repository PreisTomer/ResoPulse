# Lab Context — In-Vitro Digital Twin (Read First)

This is a **virtual in-vitro lab** — a digital twin of cuvette / well-plate electroporation / acoustic resonance experiments on cells or suspensions. The user is a bench scientist, not a clinician.

**Every user-visible string must read for the lab bench, not the clinic.** Ask: *"Does this make sense to a scientist running an experiment on cells in a dish?"*

## Allowed terminology
- Cell populations: "target cell", "reference cell", "healthy cell"
- Outcomes: "cell lysis", "membrane disruption", "pore formation", "viability", "population lysis fraction", "co-culture assay"
- Biophysics: "protocol window", "selectivity ratio", "Therapeutic Index" (TI is biophysics, not clinical)
- Hardware: "cuvette", "well plate", "electrode gap", "EP buffer", "cell suspension"
- Instruments: "pulse generator", "function generator", "RF amplifier"

## Forbidden framings
- Clinical: "patient", "surgery", "implant", "probe", "catheter", "clinical device/window/advantage", "tumour ablation zone", "treatment", "prescribe"
- In-vivo: "tissue penetration for patient treatment", "in-vivo protocol", "animal model outcome" (literature citations may quote paper titles verbatim, but annotation notes must reframe to lab-model relevance)
- Regulatory: "FDA", "approval", "contraindication"

## When physics has both in-vitro and in-vivo literature
Describe the effect in the simulation: *"Lower σ_e shifts τ and f_c — relevant when modelling cells in low-conductivity EP buffer"*, not *"used in intravascular catheter IRE"*.
