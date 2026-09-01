import { describe, expect, it } from 'vitest'
import { generateCandidatePool } from '../ml/activeLearning/candidates'
import { FrozenProductionLearner } from '../ml/benchmark/frozenBaseline'
import { policyRegistry } from '../ml/benchmark/policies'
import type { OnlineObservation } from '../ml/online/types'
import { seededRandom } from '../ml/simulation/oracle'

describe('frozen production benchmark adapter', () => {
  it('preserves the production ensemble size and click-dependent update schedule', () => {
    const learner = new FrozenProductionLearner(611)
    const pool = generateCandidatePool(4, 91)
    const before = learner.predict(pool[0], pool[1]).probability
    learner.update({ a: pool[0], b: pool[1], chosenA: 1, timestamp: 0, localHour: 0, weekday: 0, elapsedDays: 0 })
    expect(learner.parameterCount).toBe(2925)
    expect(learner.updateEpochs).toEqual([7])
    expect(learner.predict(pool[0], pool[1]).probability).toBeGreaterThan(before)
  })
})

describe('active policy registry', () => {
  it('contains every required cheap policy and always proposes two distinct colors', () => {
    const learner = new FrozenProductionLearner(611)
    const pool = generateCandidatePool(80, 92)
    const history: OnlineObservation[] = []
    expect(policyRegistry.map(policy => policy.id)).toEqual([
      'uniform-random', 'frozen-current-heuristic', 'uncertainty-focused',
      'diversity-exploration', 'incumbent-challenger', 'thompson-like',
    ])
    for (const policy of policyRegistry) {
      const [a, b] = policy.select(learner, history, pool, 0, seededRandom(3))
      expect(a).not.toEqual(b)
    }
  })
})
