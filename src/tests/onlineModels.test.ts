import { describe, expect, it } from 'vitest'
import { QuadraticBT } from '../ml/online/quadratic'
import { RbfBT } from '../ml/online/rbf'
import { ConfigurableMLP } from '../ml/online/mlp'
import { ReplayController } from '../ml/online/replay'
import { NeuralEnsemble, RepeatedUpdateLearner } from '../ml/online/neuralStrategies'
import type { OnlineLearner, OnlineObservation } from '../ml/online/types'

const preferred = { l: .68, c: .17, h: 280 }
const rejected = { l: .42, c: .04, h: 70 }
const example: OnlineObservation = { a: preferred, b: rejected, chosenA: 1, timestamp: 1, localHour: 12, weekday: 1, elapsedDays: 0 }

describe.each([
  ['quadratic', () => new QuadraticBT(4)],
  ['rbf', () => new RbfBT(4, 24)],
  ['small neural', () => new ConfigurableMLP(4, [6, 12, 8, 1])],
] as const)('%s online learner', (_name, create) => {
  it('learns only after update and remains finite', () => {
    const learner = create()
    const before = learner.predict(preferred, rejected).probability
    for (let i = 0; i < 80; i++) learner.update(example)
    const after = learner.predict(preferred, rejected).probability
    expect(after).toBeGreaterThan(before)
    expect(Number.isFinite(after)).toBe(true)
    expect(learner.parameterCount).toBeGreaterThan(0)
  })
})

it('historical replay retains an old preference better than newest-only on a conflicting burst', () => {
  const make = (): OnlineLearner => new QuadraticBT(17)
  const newest = new ReplayController(make(), { kind: 'newest', replayCount: 0, capacity: 100, seed: 1 })
  const replay = new ReplayController(make(), { kind: 'uniform', replayCount: 4, capacity: 100, seed: 1 })
  for (let i = 0; i < 35; i++) { newest.update(example); replay.update(example) }
  const conflict = { ...example, chosenA: 0 as const }
  for (let i = 0; i < 8; i++) { newest.update(conflict); replay.update(conflict) }
  expect(replay.predict(preferred, rejected).probability).toBeGreaterThan(newest.predict(preferred, rejected).probability)
})

it('supports frozen repeated-update and true neural ensembles', () => {
  const repeated = new RepeatedUpdateLearner(new ConfigurableMLP(44, [6, 12, 8, 1], .003), 3)
  const ensemble = new NeuralEnsemble(45, [6, 12, 8, 1], 3, 2, .003)
  const beforeRepeated = repeated.predict(preferred, rejected).probability
  const beforeEnsemble = ensemble.predict(preferred, rejected).probability
  repeated.update(example)
  ensemble.update(example)
  expect(repeated.predict(preferred, rejected).probability).toBeGreaterThan(beforeRepeated)
  expect(ensemble.predict(preferred, rejected).probability).toBeGreaterThan(beforeEnsemble)
  expect(repeated.parameterCount).toBe(197)
  expect(ensemble.parameterCount).toBe(591)
  expect(ensemble.predict(preferred, rejected).uncertainty).toBeGreaterThanOrEqual(0)
  const restored = NeuralEnsemble.deserialize(ensemble.serialize())
  expect(restored.predict(preferred, rejected).probability).toBeCloseTo(ensemble.predict(preferred, rejected).probability, 12)
})
