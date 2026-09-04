import type { OKLCH } from '../../app/types'
import { gamutMap, inGamut } from '../../color/color'
import { seededRandom } from '../simulation/oracle'

const fract = (value: number) => value - Math.floor(value)

export function generateCandidatePool(count: number, seed: number): OKLCH[] {
  const rng = seededRandom(seed)
  const colors: OKLCH[] = []
  for (let i = 0; i < count; i++) {
    const l = 0.24 + 0.66 * fract(i * 0.61803398875 + rng() * 0.08)
    const h = rng() * 360
    const c = 0.025 + 0.29 * Math.sqrt(rng())
    const raw = { l, c, h }
    const mapped = gamutMap(raw)
    if (mapped.c >= 0.012 && inGamut(mapped)) colors.push(mapped)
  }
  return colors
}
