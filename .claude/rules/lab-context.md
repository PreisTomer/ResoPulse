# Lab Context — Bioproduction Process Development Platform (Read First)

This is an **AI-guided bioproduction platform** — a simulation and prediction tool for process development scientists designing and optimizing the manufacture of biologics (monoclonal antibodies, recombinant proteins, viral vectors, plasmid DNA, vaccine antigens) using cells as production factories.

**The user is a process development scientist at a small biotech, biopharma, or food-tech company.** Not a clinician. Not a bench researcher studying basic biology. Someone who designs bioprocesses end-to-end: cell line selection → genetic engineering → transfection → upstream production → downstream purification.

**Every user-visible string must read for the process development scientist designing a biologic manufacturing workflow.** Ask: *"Does this make sense to a PD scientist optimizing a CHO mAb process?"*

The platform covers three modules:
1. **Cell Engineering** — host cell selection, genetic strategy, transfection optimization (Module 1c reuses EP physics)
2. **Clone & Upstream** — clone screening, media optimization, bioreactor design
3. **Downstream** — purification process design, yield prediction, bottleneck analysis

## Allowed terminology

**Cell biology / engineering:**
- Host cell lines: "CHO-K1", "CHO-S", "CHO-DG44", "HEK293T", "HEK293F", "Expi293F", "Sf9", "BL21(DE3)", "Pichia pastoris", "host cell", "cell line"
- Manipulation: "transfection", "transient expression", "stable expression", "clone", "clonal stability", "single-cell cloning", "pool", "passage"
- Genetic: "vector", "plasmid", "promoter", "CMV", "EF1α", "CAG", "codon optimization", "secretion signal", "selection marker", "expression construct", "gene of interest", "ORF"
- Biology: "cell viability", "viable cell density (VCD)", "doubling time", "specific productivity (qP)", "titer", "transfection efficiency"

**Upstream / production:**
- "bioreactor", "stirred tank", "perfusion", "fed-batch", "seed train", "harvest", "media", "feed", "basal medium", "supplements", "dissolved oxygen (DO)", "pH control", "temperature shift", "glucose", "lactate", "glutamine", "ammonia"

**Downstream / purification:**
- Step types: "clarification", "depth filtration", "centrifugation", "capture", "Protein A", "IMAC", "ion exchange (IEX)", "hydrophobic interaction (HIC)", "mixed-mode", "polish", "viral inactivation", "ultrafiltration", "diafiltration", "UF/DF", "formulation"
- Process metrics: "yield", "step yield", "cumulative yield", "recovery", "host cell protein (HCP) clearance", "DNA clearance", "log reduction value (LRV)", "aggregate", "charge variant", "fragment", "purity"
- Hardware: "chromatography column", "skid", "resin", "membrane", "filter cartridge", "load density", "elution gradient", "buffer exchange"

**EP-specific (still valid in Module 1c transfection optimizer):**
- "cuvette", "well plate", "electrode gap", "EP buffer", "cell suspension", "pulse generator", "function generator"
- "transmembrane potential (Vm)", "pore formation", "transfection window" (replaces "protocol window" in bioproduction context), "reversible electroporation"
- The 50–85% disruption ratio range in EP physics is now framed as the **transfection window** (efficient DNA delivery without killing the cell), not "lysis selectivity"

**Outcomes / predictions:**
- "predicted titer", "predicted yield", "predicted viability", "predicted transfection efficiency", "uncertainty range", "developability score" (labelled "simulator construct"), "yield waterfall"

**Target molecules (products being manufactured):**
- "monoclonal antibody (mAb)", "bispecific antibody", "fusion protein", "recombinant protein", "viral vector", "AAV", "lentivirus", "plasmid DNA", "vaccine antigen", "enzyme"

## Forbidden framings

**Clinical (no therapeutic claims):**
- Never: "patient", "treatment", "therapy", "indication", "dosage for human use", "clinical trial outcome", "prescribe", "surgery", "implant", "catheter", "tumour ablation"
- The platform predicts *manufacturing process outcomes* for biologics; it does NOT predict clinical efficacy, safety in patients, or therapeutic benefit

**Regulatory overreach (no compliance claims):**
- Never: "FDA-approved", "GMP-compliant", "ICH-compliant", "21 CFR 11 compliant", "validated for cGMP manufacturing", "regulatory approved"
- The platform supports process *development*, not GMP manufacturing execution; users do their own validation and regulatory work
- Allowed: "consistent with FDA guidance on X", "informed by ICH Q11 principles", "supports IND-enabling characterization" — only when accurate and qualified

**Measurement vs prediction (honesty pillar):**
- Never present a predicted value as a measurement
- Every model output is a *prediction*, every empirical lookup is a *literature-derived estimate*, every uncertainty range is explicit
- See `@.claude/rules/honesty.md` for the full doctrine

**Big-pharma framing:**
- The target user is **small biotech / biopharma / food-tech** with 10–200 people, not Pfizer/Roche/Genentech
- Avoid framing that assumes enterprise-scale resources: "your QbD program", "your CMC team", "your regulatory affairs department"
- Prefer: "your team", "your process", "your campaign", "your lab"

**In-vivo / animal model:**
- Literature citations may quote paper titles verbatim
- Annotation notes must reframe to the in-vitro / cell-culture / bioprocess context the platform models
- The platform does NOT model animal pharmacokinetics, biodistribution, or in-vivo efficacy

## When physics, biology, or process science has multiple contexts

Always describe the effect in the platform's simulation context — the in-vitro process step being modelled, the cell culture parameter being optimized, the purification step being predicted.

**Good:** *"Lower σ_e in low-conductivity EP buffer shifts τ and f_c, narrowing the transfection window for CHO cells"*
**Bad:** *"Used in intravascular catheter IRE for tumour ablation"*

**Good:** *"Protein A capture typically yields 92–98% recovery for mAbs; load density >40 g/L resin can reduce yield"*
**Bad:** *"Protein A purification gives patients consistent dosing"*

**Good:** *"This developability score is a simulator construct ranking cell line + strategy combinations by predicted productivity"*
**Bad:** *"This developability score predicts clinical success"*
