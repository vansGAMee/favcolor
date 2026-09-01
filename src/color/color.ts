import type { OKLCH, RGB } from '../app/types'

const clamp = (value: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, value))
const linearToSrgb = (x: number) => x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(Math.max(0, x), 1 / 2.4) - 0.055
const srgbToLinear = (x: number) => x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)

export const wrapHue = (h: number) => ((h % 360) + 360) % 360

export function oklchToOklab(color: OKLCH) {
  const angle = wrapHue(color.h) * Math.PI / 180
  return { l: color.l, a: color.c * Math.cos(angle), b: color.c * Math.sin(angle) }
}

export function oklchToSrgb(color: OKLCH): RGB {
  const lab = oklchToOklab(color)
  const l_ = lab.l + 0.3963377774 * lab.a + 0.2158037573 * lab.b
  const m_ = lab.l - 0.1055613458 * lab.a - 0.0638541728 * lab.b
  const s_ = lab.l - 0.0894841775 * lab.a - 1.291485548 * lab.b
  const l = l_ * l_ * l_
  const m = m_ * m_ * m_
  const s = s_ * s_ * s_
  return {
    r: linearToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    g: linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    b: linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  }
}

export function srgbToOklch(rgb: RGB): OKLCH {
  const r = srgbToLinear(clamp(rgb.r))
  const g = srgbToLinear(clamp(rgb.g))
  const b = srgbToLinear(clamp(rgb.b))
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b
  const l_ = Math.cbrt(l)
  const m_ = Math.cbrt(m)
  const s_ = Math.cbrt(s)
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_
  const c = Math.hypot(a, bb)
  return { l: L, c, h: c < 1e-12 ? 0 : wrapHue(Math.atan2(bb, a) * 180 / Math.PI) }
}

export function inGamut(color: OKLCH) {
  const rgb = oklchToSrgb(color)
  return Object.values(rgb).every(value => Number.isFinite(value) && value >= -1e-7 && value <= 1 + 1e-7)
}

export function gamutMap(color: OKLCH): OKLCH {
  const base = { l: clamp(Number.isFinite(color.l) ? color.l : 0.5), c: Math.max(0, Number.isFinite(color.c) ? color.c : 0), h: wrapHue(Number.isFinite(color.h) ? color.h : 0) }
  if (inGamut(base)) return base
  let low = 0
  let high = base.c
  for (let i = 0; i < 25; i++) {
    const mid = (low + high) / 2
    if (inGamut({ ...base, c: mid })) low = mid
    else high = mid
  }
  return { ...base, c: low }
}

export function toHex(rgb: RGB) {
  const channel = (x: number) => Math.round(clamp(x) * 255).toString(16).padStart(2, '0')
  return `#${channel(rgb.r)}${channel(rgb.g)}${channel(rgb.b)}`
}

export const colorToHex = (color: OKLCH) => toHex(oklchToSrgb(gamutMap(color)))

export function oklabDistance(a: OKLCH, b: OKLCH) {
  const aa = oklchToOklab(a)
  const bb = oklchToOklab(b)
  return Math.hypot(aa.l - bb.l, aa.a - bb.a, aa.b - bb.b)
}

export function colorFeatures(color: OKLCH) {
  const h = wrapHue(color.h) * Math.PI / 180
  return [color.l, color.c, Math.sin(h), Math.cos(h), Math.sin(2 * h), Math.cos(2 * h)]
}

export function colorCss(color: OKLCH) {
  return colorToHex(color)
}
