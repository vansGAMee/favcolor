import { describe, expect, it } from 'vitest'
import { colorFeatures, gamutMap, inGamut, oklabDistance, oklchToSrgb, srgbToOklch, toHex, wrapHue } from '../color/color'

describe('OKLCH color math', () => {
  it('converts display endpoints and known red without non-finite values', () => {
    expect(toHex(oklchToSrgb({ l: 0, c: 0, h: 0 }))).toBe('#000000')
    expect(toHex(oklchToSrgb({ l: 1, c: 0, h: 0 }))).toBe('#ffffff')
    const red = srgbToOklch({ r: 1, g: 0, b: 0 })
    expect(red.l).toBeCloseTo(0.628, 2)
    expect(red.c).toBeCloseTo(0.258, 2)
    expect(red.h).toBeCloseTo(29.23, 0)
  })

  it('wraps hue and round-trips ordinary colors', () => {
    expect(wrapHue(-30)).toBe(330)
    expect(wrapHue(750)).toBe(30)
    const rgb = { r: 0.17, g: 0.51, b: 0.83 }
    const restored = oklchToSrgb(srgbToOklch(rgb))
    expect(restored.r).toBeCloseTo(rgb.r, 4)
    expect(restored.g).toBeCloseTo(rgb.g, 4)
    expect(restored.b).toBeCloseTo(rgb.b, 4)
  })

  it('maps out-of-gamut colors to finite display colors', () => {
    const mapped = gamutMap({ l: 0.6, c: 0.9, h: 140 })
    const rgb = oklchToSrgb(mapped)
    expect(inGamut(mapped)).toBe(true)
    expect(Object.values(rgb).every(Number.isFinite)).toBe(true)
  })

  it('has symmetric distance, zero identity, and six finite model features', () => {
    const a = { l: 0.6, c: 0.14, h: 25 }
    const b = { l: 0.72, c: 0.19, h: 250 }
    expect(oklabDistance(a, b)).toBeCloseTo(oklabDistance(b, a), 12)
    expect(oklabDistance(a, a)).toBe(0)
    expect(colorFeatures(a)).toHaveLength(6)
    expect(colorFeatures({ l: 1, c: 0, h: 360 }).every(Number.isFinite)).toBe(true)
  })

  it('does not encode an arbitrary hue for an achromatic color', () => {
    const grayAtRedHue = colorFeatures({ l: .6, c: 0, h: 25 })
    const grayAtCyanHue = colorFeatures({ l: .6, c: 0, h: 195 })
    expect(grayAtRedHue).toEqual(grayAtCyanHue)
    expect(grayAtRedHue.slice(2)).toEqual([0, 0, 0, 0])
  })
})
