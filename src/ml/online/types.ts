import type { OKLCH } from '../../app/types'

export interface OnlineObservation {
  a: OKLCH
  b: OKLCH
  chosenA: 0 | 1
  timestamp: number
  localHour: number
  weekday: number
  elapsedDays: number
  predictedProbability?: number
  uncertainty?: number
}

export interface OnlinePrediction { probability: number; uncertainty: number }

export interface OnlineLearner {
  readonly id: string
  readonly modelClass: string
  readonly parameterCount: number
  predict(a: OKLCH, b: OKLCH): OnlinePrediction
  update(observation: OnlineObservation): void
  utility(color: OKLCH): number
}

export interface QueryPolicy {
  readonly id: string
  select(learner: OnlineLearner, history: readonly OnlineObservation[], pool: readonly OKLCH[], step: number, random: () => number): readonly [OKLCH, OKLCH]
}

export interface HiddenScenario {
  readonly id: string
  readonly family: string
  readonly seed: number
  probability(a: OKLCH, b: OKLCH, step: number): number
  sample(a: OKLCH, b: OKLCH, step: number, random: () => number): 0 | 1
  optimumAt(step: number, pool: readonly OKLCH[]): OKLCH
}
