import type { OKLCH, TrainingExample } from '../../app/types'
import { oklchToOklab } from '../../color/color'
import { generateCandidatePool } from '../activeLearning/candidates'

export function seededRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let t = state
    t = Math.imul(t ^ t >>> 15, t | 1)
    t ^= t + Math.imul(t ^ t >>> 7, t | 61)
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

export function makeOracle(optimum: OKLCH, contextStrength = 0, driftStrength = 0) {
  const optimumLab = oklchToOklab(optimum)
  const utility = (color: OKLCH, hour: number, elapsedDays: number) => {
    const lab = oklchToOklab(color)
    const phase = 2 * Math.PI * hour / 24
    const drift = driftStrength * Math.min(1, elapsedDays / 90)
    const targetA = optimumLab.a + 0.13 * drift
    const targetB = optimumLab.b - 0.1 * drift
    const core = -22 * ((lab.l - optimumLab.l) ** 2 + (lab.a - targetA) ** 2 + (lab.b - targetB) ** 2)
    return core + contextStrength * Math.sin(phase) * (4 * lab.a - 2 * lab.b)
  }
  return {
    optimum,
    utility,
    choose(a: OKLCH, b: OKLCH, rng: () => number, index: number): TrainingExample {
      const localHour = (index * 7) % 24
      const elapsedDays = index * 0.55
      const diff = utility(a, localHour, elapsedDays) - utility(b, localHour, elapsedDays)
      const p = 1 / (1 + Math.exp(-diff))
      return { a, b, chosenA: rng() < p ? 1 : 0, timestamp: index * 86_400_000, localHour, weekday: index % 7, elapsedDays }
    },
  }
}

export function simulateDataset(oracle: ReturnType<typeof makeOracle>, count: number, seed: number) {
  const rng = seededRandom(seed)
  const pool = generateCandidatePool(Math.max(320, count * 2), seed + 300)
  const examples: TrainingExample[] = []
  for (let i = 0; i < count; i++) {
    const a = pool[Math.floor(rng() * pool.length)]
    const b = pool[Math.floor(rng() * pool.length)]
    examples.push(oracle.choose(a, b, rng, i))
  }
  return examples
}
