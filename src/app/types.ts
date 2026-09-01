export type OKLCH = { l: number; c: number; h: number }
export type RGB = { r: number; g: number; b: number }
export type PairType = 'normal' | 'repeated-control' | 'validation' | 'local-challenge'
export type ModelState = 'Learning' | 'Narrowing' | 'Testing candidate' | 'Ready'

export interface ChoiceEvent {
  id: string
  colorA: OKLCH
  colorB: OKLCH
  chosen: 'a' | 'b'
  timestamp: number
  localHour: number
  weekday: number
  elapsedSinceStartMs: number
  reactionTimeMs: number
  leftColor: 'a' | 'b'
  modelVersion: number
  pairType: PairType
  distance: number
  predictedProbabilityBeforeChoice?: number
  estimatedOptimumBeforeChoice?: OKLCH
  estimatedOptimumAfterChoice?: OKLCH
  modelStateBeforeChoice?: ModelState
  modelStateAfterChoice?: ModelState
  modelConfig?: { class: string; architecture: number[]; ensembleMembers: number; updateSchedule: string }
}

export interface ValidationMetrics {
  count: number
  logLoss: number
  accuracy: number
  brier: number
  baselineLogLoss: number
  randomLogLoss: number
  beatsBaseline: boolean
  folds: number
  foldWins: number
}

export interface DailySnapshot {
  date: string
  color: OKLCH
  hex: string
  state: ModelState
  totalChoices: number
  validation: ValidationMetrics | null
}

export interface TrainingExample {
  a: OKLCH
  b: OKLCH
  chosenA: 0 | 1
  timestamp: number
  localHour: number
  weekday: number
  elapsedDays: number
}
