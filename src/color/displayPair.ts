import type { OKLCH } from '../app/types'
import { colorToHex, oklabDistance, srgbToOklch } from './color'

export type ColorPair = readonly [OKLCH, OKLCH]
const MIN_RENDERED_OKLAB_DISTANCE = 0.025

function renderedColor(color: OKLCH) {
  const hex = colorToHex(color)
  const channel = (offset: number) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255
  return { hex, color: srgbToOklch({ r: channel(1), g: channel(3), b: channel(5) }) }
}

export function isUsefulRenderedPair(pair: ColorPair) {
  const a = renderedColor(pair[0])
  const b = renderedColor(pair[1])
  return a.hex !== b.hex && oklabDistance(a.color, b.color) >= MIN_RENDERED_OKLAB_DISTANCE
}

export function ensureUsefulRenderedPair(generate: (attempt: number) => ColorPair, maxAttempts = 12): ColorPair {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const pair = generate(attempt)
    if (isUsefulRenderedPair(pair)) return pair
  }
  // Emergency-only neutral fallback: bounded, displayable, and far apart.
  return [{ l: 0.25, c: 0, h: 0 }, { l: 0.8, c: 0, h: 0 }]
}
