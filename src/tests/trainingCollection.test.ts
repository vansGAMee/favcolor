import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { OKLCH, PairType } from '../app/types'
import { collectTrainingObservation, setTrainingSharing, type TrainingObservation } from '../data/trainingCollection'
import { createTrainingClient } from '../data/supabaseClient'

const color = (h: number): OKLCH => ({ l: .65, c: .16, h })
const observation = (index: number, overrides: Partial<TrainingObservation> = {}): TrainingObservation => ({
  colorA: color(index * 17), colorB: color(index * 17 + 80), chosen: index % 2 ? 'b' : 'a',
  predictionA: .64, modelVersion: 2, pairType: 'normal' as PairType,
  chosenSide: index % 2 ? 'right' : 'left', reactionTimeMs: 700,
  ...overrides,
})

const goodSession = () => {
  const base = Array.from({ length: 40 }, (_, index) => observation(index))
  return [...base, ...base.slice(0, 4).map((item, index) => ({ ...item, pairType: 'repeated-control' as const, chosenSide: index % 2 ? 'right' as const : 'left' as const }))]
}

describe('voluntary training collection', () => {
  beforeEach(() => localStorage.clear())

  it('never contacts the transport without explicit opt-in', async () => {
    const insert = vi.fn()
    await collectTrainingObservation(observation(0), insert)
    expect(insert).not.toHaveBeenCalled()
  })

  it('creates a minimal good payload after opt-in', async () => {
    setTrainingSharing(true)
    const insert = vi.fn().mockResolvedValue(undefined)
    for (const item of goodSession()) await collectTrainingObservation(item, insert)
    expect(insert).toHaveBeenCalledOnce()
    expect(insert.mock.calls[0][0]).toMatchObject({ model_version: 2, quality: 'good' })
    expect(insert.mock.calls[0][0].payload.observations).toHaveLength(44)
    expect(insert.mock.calls[0][0].payload.observations[0]).not.toHaveProperty('chosenSide')
  })

  it('does not send a constant-side poor session', async () => {
    setTrainingSharing(true)
    const insert = vi.fn()
    for (let index = 0; index < 44; index++) await collectTrainingObservation(observation(index, { chosenSide: 'left' }), insert)
    expect(insert).not.toHaveBeenCalled()
  })

  it('does not send a session that contradicts repeated controls', async () => {
    setTrainingSharing(true)
    const insert = vi.fn()
    const session = goodSession().map(item => item.pairType === 'repeated-control' ? { ...item, chosen: item.chosen === 'a' ? 'b' as const : 'a' as const } : item)
    for (const item of session) await collectTrainingObservation(item, insert)
    expect(insert).not.toHaveBeenCalled()
  })

  it('keeps the batch and resolves safely when the network fails', async () => {
    setTrainingSharing(true)
    const insert = vi.fn().mockRejectedValue(new Error('offline'))
    let result = 'buffered'
    for (const item of goodSession()) result = await collectTrainingObservation(item, insert)
    expect(result).toBe('network-error')
    expect(JSON.parse(localStorage.getItem('favcolor-training-buffer-v1') ?? '{}').observations).toHaveLength(44)
  })

  it('creates a browser client with only URL and publishable key', () => {
    const client = createTrainingClient('https://example.supabase.co', 'sb_publishable_test')
    expect(client).toBeTruthy()
  })
})
