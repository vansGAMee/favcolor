import type { OKLCH } from '../../app/types'
import { gamutMap, oklabDistance, oklchToOklab, wrapHue } from '../../color/color'
import type { HiddenScenario } from '../online/types'
import { seededRandom } from './oracle'

export const SCENARIO_FAMILIES = ['smooth', 'narrow', 'plateau', 'multimodal', 'ring', 'hue', 'chroma', 'lightness', 'interaction', 'boundary', 'muted', 'saturated', 'cyclic'] as const

const hueDistance = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180) / 180

export function createScenario(seed: number): HiddenScenario {
  const random = seededRandom(seed * 7919 + 17)
  const family = SCENARIO_FAMILIES[seed % SCENARIO_FAMILIES.length]
  const base = gamutMap({ l: .32 + random() * .54, c: .04 + random() * .25, h: random() * 360 })
  const second = gamutMap({ l: .3 + random() * .56, c: .05 + random() * .24, h: base.h + 120 + random() * 100 })
  const noiseIndex = Math.floor(seed / SCENARIO_FAMILIES.length) % 6
  const temperature = noiseIndex === 4 ? 2.3 : noiseIndex === 5 ? 1.5 : 1
  const lapse = noiseIndex === 2 ? .05 : noiseIndex === 3 ? .1 : 0
  const labBase = oklchToOklab(base)
  const utility = (color: OKLCH, step: number) => {
    const p = oklchToOklab(color)
    const driftHue = noiseIndex === 5 ? step * .28 : 0
    const target = { ...base, h: wrapHue(base.h + driftHue) }
    const d = oklabDistance(color, target)
    switch (family) {
      case 'smooth': return -24 * d * d
      case 'narrow': return -70 * d * d
      case 'plateau': return -55 * Math.pow(Math.max(0, d - .1), 2)
      case 'multimodal': return Math.max(-40 * d * d, -38 * Math.pow(oklabDistance(color, second), 2) - .08)
      case 'ring': return -75 * Math.pow(Math.abs(d - .16), 2)
      case 'hue': return -5 * Math.pow(hueDistance(color.h, target.h), 2) - 2 * Math.pow(color.l - .62, 2)
      case 'chroma': return -35 * Math.pow(color.c - base.c, 2) - 2 * Math.pow(color.l - .6, 2)
      case 'lightness': return -18 * Math.pow(color.l - base.l, 2) - .8 * Math.pow(color.c - .13, 2)
      case 'interaction': return -18 * Math.pow((p.l - labBase.l) + 1.8 * (p.a - labBase.a) * (p.b - labBase.b), 2) - 12 * Math.pow(p.a - labBase.a, 2)
      case 'boundary': return 5 * color.c - 18 * Math.pow(color.l - base.l, 2) - 2 * Math.pow(hueDistance(color.h, base.h), 2)
      case 'muted': return -65 * Math.pow(color.c - .025, 2) - 7 * Math.pow(color.l - base.l, 2)
      case 'saturated': return 6 * color.c - 12 * Math.pow(color.l - base.l, 2) - 2 * Math.pow(hueDistance(color.h, base.h), 2)
      default: return 0
    }
  }
  const probability = (a: OKLCH, b: OKLCH, step: number) => {
    if (family === 'cyclic') {
      const group = (h: number) => Math.floor(wrapHue(h + 60) / 120) % 3
      const ga = group(a.h), gb = group(b.h)
      if (ga === gb) return .5
      return (ga + 1) % 3 === gb ? .82 : .18
    }
    const diff = (utility(a, step) - utility(b, step)) / temperature
    const p = 1 / (1 + Math.exp(-Math.max(-20, Math.min(20, diff))))
    return lapse / 2 + (1 - lapse) * p
  }
  return {
    id: `${family}-${seed}`, family, seed, probability,
    sample: (a, b, step, rng) => rng() < probability(a, b, step) ? 1 : 0,
    optimumAt: (step, pool) => pool.reduce((best, color) => utility(color, step) > utility(best, step) ? color : best, pool[0]),
  }
}
