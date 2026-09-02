import { afterAll, describe, expect, it } from 'vitest'
import { colorfulSeeds, colorfulTargets, simulateColorfulRecovery, type ColorfulRecoveryRun } from '../ml/simulation/colorfulRecovery'

describe('colorful-target recovery', () => {
  const runs: ColorfulRecoveryRun[] = []

  colorfulTargets.forEach((target, targetIndex) => {
    it(`recovers the ${target.name} region after misleading early answers`, async () => {
      for (const baseSeed of colorfulSeeds) {
        const seed = baseSeed + targetIndex * 100
        runs.push(simulateColorfulRecovery(target.name, target.color, seed))
        // Each simulation is CPU-bound; yield so Vitest can service worker RPC.
        await new Promise(resolve => setTimeout(resolve, 0))
      }
    }, 60_000)
  })

  afterAll(() => {
    const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length

    expect(runs).toHaveLength(12)
    expect(mean(runs.map(run => run.recoveryLowChromaPairRate))).toBeLessThan(.35)
    expect(mean(runs.map(run => run.earlyLowChromaEndpointRate))).toBeLessThan(.35)
    expect(mean(runs.map(run => run.recoveryLowChromaEndpointRate))).toBeLessThan(.35)
    expect(mean(runs.map(run => run.distance100))).toBeLessThan(.18)
    expect(mean(runs.map(run => run.distance100))).toBeLessThan(mean(runs.map(run => run.distance25)) - .025)
    expect(runs.filter(run => run.finalChroma >= .08).length).toBeGreaterThanOrEqual(9)
  })
})
