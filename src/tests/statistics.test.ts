import { describe, expect, it } from 'vitest'
import { pairedSummary, summarize } from '../ml/benchmark/statistics'

describe('release statistics', () => {
  it('reports literal distribution statistics and paired differences', () => {
    const stats = summarize([1, 2, 3, 4, 10])
    expect(stats.mean).toBe(4)
    expect(stats.median).toBe(3)
    expect(stats.p90).toBe(10)
    expect(stats.worstDecileMean).toBe(10)
    const paired = pairedSummary([.7, .6, .5, .4], [.6, .5, .45, .35], 88)
    expect(paired.meanDifference).toBeCloseTo(-.075, 12)
    expect(paired.bootstrap95[0]).toBeLessThan(0)
    expect(paired.bootstrap95[1]).toBeLessThan(0)
  })
})
