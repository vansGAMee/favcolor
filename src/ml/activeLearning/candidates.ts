import type { OKLCH } from '../../app/types'
import { gamutMap, inGamut } from '../../color/color'
import { seededRandom } from '../simulation/oracle'

export function generateCandidatePool(count: number, seed: number): OKLCH[] {
  const rng = seededRandom(seed)
  const colors: OKLCH[] = []
  for (let i = 0; i < count; i++) {
    const l = 0.24 + 0.66 * ((i * 0.61803398875 + rng() * 0.08) % 1)
    const h = (i * 137.507764 + rng() * 35) % 360
    const raw = { l, c: 0.025 + 0.29 * Math.sqrt(rng()), h }
    const mapped = gamutMap(raw)
    if (mapped.c >= 0.012 && inGamut(mapped)) colors.push(mapped)
  }
  return colors
}
