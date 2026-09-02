import type { OKLCH, PairType } from '../app/types'

export const TRAINING_SHARING_KEY = 'favcolor-training-sharing-v1'
export const TRAINING_BUFFER_KEY = 'favcolor-training-buffer-v1'
const MIN_SESSION_SIZE = 44
const RETRY_INTERVAL = 16

export interface TrainingObservation {
  colorA: OKLCH
  colorB: OKLCH
  chosen: 'a' | 'b'
  predictionA: number
  modelVersion: number
  pairType: PairType
  chosenSide: 'left' | 'right'
  reactionTimeMs: number
}

export interface TrainingSessionRow {
  model_version: number
  quality: 'good'
  payload: {
    schema_version: 1
    observations: Array<Omit<TrainingObservation, 'chosenSide' | 'reactionTimeMs'>>
    aggregates: { choice_count: number; control_count: number; control_consistency: number; side_balance: number; median_reaction_time_ms: number }
  }
}

type BufferState = { observations: TrainingObservation[]; total: number; lastAttemptTotal: number }
export type TrainingInsert = (row: TrainingSessionRow) => Promise<void>

const sameColor = (a: OKLCH, b: OKLCH) => a.l === b.l && a.c === b.c && a.h === b.h
const samePair = (a: TrainingObservation, b: TrainingObservation) => sameColor(a.colorA, b.colorA) && sameColor(a.colorB, b.colorB)
const emptyBuffer = (): BufferState => ({ observations: [], total: 0, lastAttemptTotal: 0 })

const readBuffer = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(TRAINING_BUFFER_KEY) ?? 'null') as Partial<BufferState> | null
    return parsed && Array.isArray(parsed.observations) ? { observations: parsed.observations, total: parsed.total ?? parsed.observations.length, lastAttemptTotal: parsed.lastAttemptTotal ?? 0 } : emptyBuffer()
  } catch { return emptyBuffer() }
}

const writeBuffer = (buffer: BufferState) => localStorage.setItem(TRAINING_BUFFER_KEY, JSON.stringify(buffer))

export const trainingSharingEnabled = () => localStorage.getItem(TRAINING_SHARING_KEY) === 'true'

export function setTrainingSharing(enabled: boolean) {
  localStorage.setItem(TRAINING_SHARING_KEY, String(enabled))
  if (!enabled) localStorage.removeItem(TRAINING_BUFFER_KEY)
}

export function classifyTrainingSession(observations: TrainingObservation[]) {
  if (observations.length < MIN_SESSION_SIZE) return { quality: 'uncertain' as const, controlCount: 0, controlConsistency: 0, sideBalance: 0 }
  const leftRate = observations.filter(item => item.chosenSide === 'left').length / observations.length
  const controls = observations.flatMap(control => {
    if (control.pairType !== 'repeated-control') return []
    const original = observations.find(item => item !== control && item.pairType !== 'repeated-control' && samePair(item, control))
    return original ? [{ control, original }] : []
  })
  const consistent = controls.filter(({ control, original }) => original.chosen === control.chosen).length
  const controlConsistency = controls.length ? consistent / controls.length : 0
  const sideBalance = Math.min(leftRate, 1 - leftRate) * 2
  if (sideBalance < .1 || (controls.length >= 3 && controlConsistency < .5)) return { quality: 'poor' as const, controlCount: controls.length, controlConsistency, sideBalance }
  if (controls.length < 3 || controlConsistency < .7 || sideBalance < .3) return { quality: 'uncertain' as const, controlCount: controls.length, controlConsistency, sideBalance }
  return { quality: 'good' as const, controlCount: controls.length, controlConsistency, sideBalance }
}

function buildRow(observations: TrainingObservation[], quality: ReturnType<typeof classifyTrainingSession>): TrainingSessionRow {
  const reactionTimes = observations.map(item => Math.max(0, item.reactionTimeMs)).sort((a, b) => a - b)
  const median = reactionTimes[Math.floor(reactionTimes.length / 2)] ?? 0
  return {
    model_version: observations.at(-1)?.modelVersion ?? 0,
    quality: 'good',
    payload: {
      schema_version: 1,
      observations: observations.map(({ chosenSide: _side, reactionTimeMs: _reaction, ...item }) => ({ ...item, predictionA: Math.max(0, Math.min(1, item.predictionA)) })),
      aggregates: { choice_count: observations.length, control_count: quality.controlCount, control_consistency: quality.controlConsistency, side_balance: quality.sideBalance, median_reaction_time_ms: Math.round(median) },
    },
  }
}

export async function collectTrainingObservation(observation: TrainingObservation, insert: TrainingInsert) {
  try {
    if (!trainingSharingEnabled()) return 'disabled'
    const buffer = readBuffer()
    buffer.observations = [...buffer.observations, observation].slice(-64)
    buffer.total += 1
    writeBuffer(buffer)
    const interval = buffer.lastAttemptTotal ? RETRY_INTERVAL : MIN_SESSION_SIZE
    if (buffer.observations.length < MIN_SESSION_SIZE || buffer.total - buffer.lastAttemptTotal < interval) return 'buffered'
    const quality = classifyTrainingSession(buffer.observations)
    if (quality.quality === 'poor') { localStorage.removeItem(TRAINING_BUFFER_KEY); return 'poor' }
    buffer.lastAttemptTotal = buffer.total
    writeBuffer(buffer)
    if (quality.quality !== 'good') return 'uncertain'
    try {
      await insert(buildRow(buffer.observations, quality))
      localStorage.removeItem(TRAINING_BUFFER_KEY)
      return 'sent'
    } catch { return 'network-error' }
  } catch { return 'storage-error' }
}
