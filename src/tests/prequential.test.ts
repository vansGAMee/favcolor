import { describe, expect, it } from 'vitest'
import { runPrequential } from '../ml/benchmark/prequential'
import { createScenario, SCENARIO_FAMILIES } from '../ml/simulation/suite'
import type { OnlineLearner, OnlineObservation, QueryPolicy } from '../ml/online/types'
import { cycleConflictRate } from '../ml/validation/cycles'

describe('production-matching prequential evaluation', () => {
  it('scores the current prediction before the current answer can update the learner', () => {
    const order: string[] = []
    const learner: OnlineLearner = {
      id: 'spy', modelClass: 'test', parameterCount: 0,
      predict: () => { order.push('predict'); return { probability: 0.8, uncertainty: 0.2 } },
      update: observation => { order.push(`update:${observation.chosenA}`) },
      utility: () => 0,
    }
    const policy: QueryPolicy = { id: 'fixed', select: (_learner, _history, pool) => [pool[0], pool[1]] }
    const result = runPrequential({ learner, oracle: createScenario(12), policy, budget: 1, candidateCount: 20, checkpoints: [1] })
    expect(order).toEqual(['predict', `update:${result.observations[0].chosenA}`])
    const y = result.observations[0].chosenA
    const literalLoss = y ? -Math.log(0.8) : -Math.log(0.2)
    expect(result.checkpoints[0].logLoss).toBeCloseTo(literalLoss, 12)
  })

  it('provides every required independent hidden preference family reproducibly', () => {
    expect(SCENARIO_FAMILIES).toEqual([
      'smooth', 'narrow', 'plateau', 'multimodal', 'ring', 'hue', 'chroma', 'lightness',
      'interaction', 'boundary', 'muted', 'saturated', 'cyclic',
    ])
    const a = createScenario(901)
    const b = createScenario(901)
    expect(a.id).toBe(b.id)
    expect(a.probability({ l: .6, c: .1, h: 20 }, { l: .7, c: .2, h: 220 }, 40)).toBe(b.probability({ l: .6, c: .1, h: 20 }, { l: .7, c: .2, h: 220 }, 40))
  })

  it('detects stable rock-paper-scissors evidence but not a transitive ordering', () => {
    const color = (h: number) => ({ l: .6, c: .15, h })
    const obs = (a: number, b: number, chosenA: 0 | 1): OnlineObservation => ({ a: color(a), b: color(b), chosenA, timestamp: 0, localHour: 0, weekday: 0, elapsedDays: 0 })
    const cyclic = [obs(0, 120, 1), obs(120, 240, 1), obs(240, 0, 1)]
    const transitive = [obs(0, 120, 1), obs(120, 240, 1), obs(0, 240, 1)]
    expect(cycleConflictRate(cyclic)).toBeGreaterThan(0.9)
    expect(cycleConflictRate(transitive)).toBe(0)
  })
})
