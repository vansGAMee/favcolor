import { describe, expect, it } from 'vitest'
import type { ChoiceEvent } from '../app/types'
import { controlPairKey, selectControlSource } from '../ml/activeLearning/controlSchedule'

const choice = (index: number, pairType: ChoiceEvent['pairType'] = 'normal'): ChoiceEvent => ({
  id: String(index), colorA: { l: .35 + index % 4 * .15, c: .08 + index % 3 * .05, h: index * 47 % 360 }, colorB: { l: .7 - index % 3 * .12, c: .1 + index % 2 * .08, h: (index * 47 + 120) % 360 }, chosen: index % 2 ? 'a' : 'b',
  timestamp: index + 1, localHour: 12, weekday: 1, elapsedSinceStartMs: index, reactionTimeMs: 500, leftColor: 'a', modelVersion: 2, pairType, distance: .2,
})

describe('control scheduling', () => {
  it('selects distinct, well-spaced source pairs instead of repeating the first pair', () => {
    const history = Array.from({ length: 24 }, (_, index) => choice(index))
    const first = selectControlSource(history)
    history.push({ ...first, id: 'control-1', timestamp: 30, pairType: 'repeated-control' })
    const second = selectControlSource(history)
    expect(controlPairKey(second)).not.toBe(controlPairKey(first))
    history.push({ ...second, id: 'control-2', timestamp: 40, pairType: 'repeated-control' })
    const third = selectControlSource(history)
    expect(new Set([controlPairKey(first), controlPairKey(second), controlPairKey(third)]).size).toBe(3)
  })
})
