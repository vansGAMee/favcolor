import { describe, expect, it } from 'vitest'
import { ensureUsefulRenderedPair, isUsefulRenderedPair } from '../color/displayPair'

describe('rendered pair safety', () => {
  it('rejects different OKLCH values that collapse to the same rendered pixels', () => {
    expect(isUsefulRenderedPair([{ l: 0, c: 0, h: 0 }, { l: 0.001, c: 0, h: 240 }])).toBe(false)
  })

  it('rejects pairs that remain perceptually indistinguishable after RGB quantization', () => {
    expect(isUsefulRenderedPair([{ l: 0.5, c: 0.08, h: 120 }, { l: 0.505, c: 0.08, h: 120 }])).toBe(false)
  })

  it('uses bounded retries and returns a useful fallback', () => {
    let calls = 0
    const pair = ensureUsefulRenderedPair(() => {
      calls++
      return [{ l: 0, c: 0, h: calls }, { l: 0.001, c: 0, h: calls + 1 }]
    }, 4)
    expect(calls).toBe(4)
    expect(isUsefulRenderedPair(pair)).toBe(true)
  })
})
