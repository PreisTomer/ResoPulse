// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

// Peer-reviewed sources behind the live quantitative models only (honesty rules): Module 1c EP equations (cited directly) and Module 2 upstream kinetics (cited as basis). Constructs stay uncited.

export type ReferenceCategory = 'ep' | 'upstream'

export interface ScientificReference {
  category: ReferenceCategory
  body:     string   // citation text; may contain <em>/<sub>/<sup> markup
  doi?:     string
  pmid?:    string
  url?:     string
  note?:    string   // what this source backs in the model
}

export const SCIENTIFIC_REFERENCES: ScientificReference[] = [
  // Electroporation & transfection biophysics (Module 1c)
  {
    category: 'ep',
    body: "Herman P. Schwan. <em>Electrical properties of tissue and cell suspensions.</em> Advances in Biological and Medical Physics. 1957;5:147-209.",
    doi:  "10.1016/B978-1-4832-3111-2.50008-0",
    note: "Foundational treatment of the field-induced transmembrane voltage and the 3/2 geometric factor for a spherical cell; basis for the V<sub>m</sub> term in the transfection optimizer.",
  },
  {
    category: 'ep',
    body: "Tadej Kotnik, Damijan Miklavcic. <em>Analytical description of transmembrane voltage induced by electric fields on spheroidal cells.</em> Biophysical Journal. 2000;79(2):670-679.",
    doi:  "10.1016/S0006-3495(00)76325-9",
    note: "Source of the membrane charging time constant τ = R·C<sub>m</sub>·(2σ<sub>e</sub>+σ<sub>i</sub>)/(2σ<sub>e</sub>·σ<sub>i</sub>) implemented directly in the transfection model.",
  },
  {
    category: 'ep',
    body: "James C. Weaver, Yuri A. Chizmadzhev. <em>Theory of electroporation: a review.</em> Bioelectrochemistry and Bioenergetics. 1996;41(2):135-160.",
    doi:  "10.1016/S0302-4598(96)05062-3",
    note: "Electroporation theory underlying the reversible-permeabilization window and the RC pulse-envelope factor 1 - exp(-t<sub>p</sub>/τ) used to scale V<sub>m</sub> by pulse width.",
  },
  {
    category: 'ep',
    body: "Eberhard Neumann, M. Schaefer-Ridder, Y. Wang, Peter H. Hofschneider. <em>Gene transfer into mouse lyoma cells by electroporation in high electric fields.</em> EMBO Journal. 1982;1(7):841-845.",
    doi:  "10.1002/j.1460-2075.1982.tb01257.x",
    note: "First demonstration of gene transfer by electroporation; the founding result the transfection optimizer models for DNA delivery.",
  },
  {
    category: 'ep',
    body: "Tina Batista Napotnik, Matej Reberšek, Peter Thomas Vernier, Branka Mali, Damijan Miklavcic. <em>Effects of high voltage nanosecond electric pulses on eukaryotic cells (in vitro): A systematic review.</em> Bioelectrochemistry. 2016;110:1-12.",
    doi:  "10.1016/j.bioelechem.2016.02.011",
    note: "Systematic review of nanosecond-pulse effects; supports the partial-charging pulse-envelope factor as a predictor of permeabilization across pulse-width regimes.",
  },
  {
    category: 'ep',
    body: "Olga N. Pakhomova, et al. <em>Electroporation-induced electrosensitization.</em> PLoS ONE. 2011;6(2):e17100.",
    doi:  "10.1371/journal.pone.0017100",
    note: "Prior pulses lower the permeabilization threshold of subsequent pulses; basis for the cumulative-pulse threshold reduction V<sub>th</sub>·N<sup>-0.20</sup> in the transfection model.",
  },

  // Upstream culture kinetics (Module 2, simplified phenomenological)
  {
    category: 'upstream',
    body: "Jianlin Xu, Peifeng Tang, Andrew Yongky, Barry Drew, Michael C. Borys, Shijie Liu, Zheng Jian Li. <em>Systematic development of temperature shift strategies for Chinese hamster ovary cells based on short duration cultures and kinetic modeling.</em> mAbs. 2019;11(1):191-204.",
    doi:  "10.1080/19420862.2018.1525262",
    note: "Kinetic basis for the biphasic temperature shift in the bioreactor model (slowed growth, elevated specific productivity after the shift). The simulator uses a simplified logistic form, not a reproduction of this study.",
  },
  {
    category: 'upstream',
    body: "Tina A. Bibila, David K. Robinson. <em>In pursuit of the optimal fed-batch process for monoclonal antibody production.</em> Biotechnology Progress. 1995;11(1):1-13.",
    doi:  "10.1021/bp00031a001",
    note: "Establishes the integral of viable cell concentration (IVCC) as the principal determinant of fed-batch titer; basis for the media and feed model's IVCC-driven titer projection.",
  },
]
