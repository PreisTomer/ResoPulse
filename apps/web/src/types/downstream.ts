// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

// Downstream process types — Module 3. A process is an ordered list of step instances
// applied to a starting titer, producing a cumulative yield prediction.

export interface ProcessStepInstance {
  id:          string                      // uuid for this instance in the train
  stepType:    string                      // processStepCatalog entry id
  paramValues: Record<string, number>      // overrides keyed by StepParameter.key; defaults apply when absent
}

export interface StepYieldResult {
  instanceId:       string
  stepType:         string
  inputMassG:       number
  outputMassG:      number
  yieldPct:         number                 // this step's recovery, 0-100
  uncertaintyPct:   [number, number]       // low/high bound of the yield range
  cumulativeYieldPct: number               // start to end-of-this-step, 0-100
  hcpLogReduction:  number
  dnaLogReduction:  number
}

export interface DownstreamPrediction {
  steps:               StepYieldResult[]
  startingMassG:       number
  finalMassG:          number
  cumulativeYieldPct:  number              // 0-100 overall recovery
  totalHcpLogReduction: number
  totalDnaLogReduction: number
  bottleneckInstanceId: string | null      // step dragging total yield down most
}
