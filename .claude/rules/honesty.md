# Scientific Honesty — Non-Negotiable

ResoPulse is a **simulation tool**. Every model output is a prediction, not a measurement. Honesty about what the platform is and what its models can and cannot do is a core product pillar.

## Mandatory rules

1. **Every model output is labelled as a prediction** (label, tooltip, or adjacent doc). Never present a simulated number as if measured.
2. **Approximations are disclosed where they are used** — co-located with the output, not in a footnote.
3. **Empirical constants name their uncertainty ranges** (e.g. α = 0.20 is a population midpoint; σ_i bands ±20–45% appear on the chart; TI shows uncertainty bounds).
4. **Simulator constructs are labelled "simulator construct, not from cited works"** — follow the Biomodulation Score (BMS) pattern for any new scoring or composite index.
5. **Scope limits are stated at every boundary** where a user might misapply output (in-vitro only, breaks at high packing fractions, "unvalidated at RF", etc.).
6. **Do not soften or remove existing disclosures.** If you think a caveat is obsolete, raise it; do not silently delete it.

## Where honesty surfaces

| Location | What to check |
|---|---|
| Slider tooltip (v-tip) | Names the source and limitations of a modelled parameter |
| Protocol page (§3.x) | Includes a "Model caveats" or `warnBox` entry for new models |
| Selectivity panel / TI score | Clear that this is a model ratio, not measured |
| Population panel | Lysis fractions labelled as predictions |
| Home page disclaimer | Includes "for research visualisation only · not a medical device" |
| Any composite score / index | Labelled "simulator construct" if not peer-reviewed in that exact form |
