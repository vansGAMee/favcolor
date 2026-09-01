import { describe, expect, it } from 'vitest'
import { chronologicalSplits, evaluateFactors } from '../ml/validation/validation'
import { makeOracle, simulateDataset } from '../ml/simulation/oracle'

describe('chronological validation and factor gates', () => {
  it('never leaks future examples into training', () => {
    const splits = chronologicalSplits(Array.from({ length: 40 }, (_, i) => ({ timestamp: i })), 20, 5)
    expect(splits.length).toBeGreaterThan(0)
    for (const split of splits) expect(Math.max(...split.train.map(x => x.timestamp))).toBeLessThan(Math.min(...split.test.map(x => x.timestamp)))
  })

  it('admits real time context but not a null context systematically', () => {
    const withEffect = simulateDataset(makeOracle({ l: 0.62, c: 0.17, h: 260 }, 2.5), 220, 31)
    const withoutEffect = simulateDataset(makeOracle({ l: 0.62, c: 0.17, h: 260 }, 0), 220, 31)
    expect(evaluateFactors(withEffect).context.active).toBe(true)
    expect(evaluateFactors(withoutEffect).context.active).toBe(false)
  }, 30000)

  it('admits slow drift but keeps stable-user drift near zero', () => {
    const shifting = simulateDataset(makeOracle({ l: 0.65, c: 0.18, h: 280 }, 0, 2), 240, 51)
    const stable = simulateDataset(makeOracle({ l: 0.65, c: 0.18, h: 280 }, 0, 0), 240, 51)
    expect(evaluateFactors(shifting).drift.active).toBe(true)
    expect(evaluateFactors(stable).drift.active).toBe(false)
  }, 30000)
})
