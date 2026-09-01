import type { OKLCH } from '../../app/types'
import { gamutMap, oklabDistance } from '../../color/color'
import { generateCandidatePool } from '../activeLearning/candidates'
import type { PreferenceEnsemble } from '../ensemble/ensemble'
import { seededRandom } from '../simulation/oracle'

export type OptimumResult = OKLCH & { spread: number; memberOptima: OKLCH[]; distanceTo: (color: OKLCH) => number }

export function searchOptimum(ensemble: PreferenceEnsemble, candidateCount = 1200, seed = 1): OptimumResult {
  const pool = generateCandidatePool(candidateCount, seed)
  const memberOptima = ensemble.models.map((_, modelIndex) => pool.reduce((best, color) => ensemble.utility(color, modelIndex) > ensemble.utility(best, modelIndex) ? color : best, pool[0]))
  const top = [...pool].sort((a, b) => ensemble.utility(b) - ensemble.utility(a)).slice(0, 10)
  const rng = seededRandom(seed + 81)
  const refined: OKLCH[] = [...top]
  for (const origin of top.slice(0, 6)) {
    let best = origin
    for (let scale = 0.08; scale >= 0.008; scale *= 0.5) {
      for (let i = 0; i < 28; i++) {
        const candidate = gamutMap({ l: best.l + (rng() - 0.5) * scale, c: Math.max(0, best.c + (rng() - 0.5) * scale), h: best.h + (rng() - 0.5) * scale * 900 })
        if (ensemble.utility(candidate) > ensemble.utility(best)) best = candidate
      }
    }
    refined.push(best)
  }
  const best = refined.reduce((a, b) => ensemble.utility(b) > ensemble.utility(a) ? b : a)
  const spread = memberOptima.reduce((sum, color) => sum + oklabDistance(color, best), 0) / memberOptima.length
  return { ...best, spread, memberOptima, distanceTo: (color: OKLCH) => oklabDistance(best, color) }
}
