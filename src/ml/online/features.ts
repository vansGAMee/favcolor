import type { OKLCH } from '../../app/types'
import { colorFeatures, oklchToOklab } from '../../color/color'

export function quadraticFeatures(color: OKLCH) {
  const p = oklchToOklab(color)
  return [p.l, p.a, p.b, p.l * p.l, p.a * p.a, p.b * p.b, p.l * p.a, p.l * p.b, p.a * p.b]
}

export const neuralFeatures = (color: OKLCH) => colorFeatures(color)

export function stableProbability(diff: number, lapse = 0) {
  const sigmoid = 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, diff))))
  return lapse / 2 + (1 - lapse) * sigmoid
}
