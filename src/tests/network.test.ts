import { describe, expect, it } from 'vitest'
import { Adam } from '../ml/optimizer/adam'
import { MLP, deserializeNetwork, serializeNetwork } from '../ml/core/network'
import { pairProbability, trainPair } from '../ml/preference/pairwise'

describe('scratch neural network', () => {
  it('initializes deterministically and serializes exact predictions', () => {
    const a = new MLP(42)
    const b = new MLP(42)
    const x = [0.5, 0.2, 0, 1, 0, 1]
    expect(a.predict(x)).toBe(b.predict(x))
    expect(deserializeNetwork(serializeNetwork(a)).predict(x)).toBe(a.predict(x))
  })

  it('matches finite-difference gradients throughout the network', () => {
    const model = new MLP(7)
    const a = [0.62, 0.14, 0.4, 0.9, 0.7, 0.3]
    const b = [0.41, 0.08, -0.7, 0.7, -1, 0]
    const analytic = model.pairGradients(a, b, 1)
    const params = model.parameters()
    for (const index of [0, 8, 143, 167, 420, params.length - 1]) {
      const original = params[index]
      const eps = 1e-4
      params[index] = original + eps
      const plus = -Math.log(pairProbability(model.predict(a), model.predict(b)))
      params[index] = original - eps
      const minus = -Math.log(pairProbability(model.predict(a), model.predict(b)))
      params[index] = original
      expect(analytic[index]).toBeCloseTo((plus - minus) / (2 * eps), 3)
    }
  })

  it('obeys pairwise symmetry and trains without non-finite weights', () => {
    const model = new MLP(3)
    const optimizer = new Adam(model.parameters().length, 0.004)
    const a = [0.6, 0.2, 1, 0, 0, -1]
    const b = [0.6, 0.2, -1, 0, 0, -1]
    expect(pairProbability(model.predict(a), model.predict(a))).toBeCloseTo(0.5, 12)
    expect(pairProbability(model.predict(a), model.predict(b)) + pairProbability(model.predict(b), model.predict(a))).toBeCloseTo(1, 12)
    const before = pairProbability(model.predict(a), model.predict(b))
    for (let i = 0; i < 120; i++) trainPair(model, optimizer, a, b, 1)
    expect(pairProbability(model.predict(a), model.predict(b))).toBeGreaterThan(before)
    expect(model.parameters().every(Number.isFinite)).toBe(true)
  })
})
