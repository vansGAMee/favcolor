import { describe, expect, it } from 'vitest'
import { recoveryTargets, simulateRecovery150, summarizeRecovery150, type Recovery150Run } from '../ml/simulation/recovery150'

describe('150-click recovery after a false early optimum', () => {
  it('keeps exploring diverse queries and recovers colorful targets', async () => {
    const runs: Recovery150Run[] = []
    for (const target of recoveryTargets) {
      runs.push(simulateRecovery150(target.name, target.color, 7))
      // Keep the Vitest worker responsive between CPU-bound simulations.
      await new Promise(resolve => setTimeout(resolve, 0))
    }
    const summary = summarizeRecovery150(runs)
    expect(summary.error150).toBeLessThan(summary.error50 - .03)
    expect(summary.logLoss150).toBeLessThan(.7)
    expect(summary.recentPairDiversity).toBeGreaterThan(.5)
    expect(summary.nearRepeatCount).toBeLessThan(14)
    expect(summary.controlPairDiversity).toBeGreaterThan(.7)
    expect(summary.recovered).toBeGreaterThanOrEqual(3)
  }, 90_000)
})
