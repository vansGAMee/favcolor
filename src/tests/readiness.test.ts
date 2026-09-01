import { describe, expect, it } from 'vitest'
import type { ChoiceEvent, ValidationMetrics } from '../app/types'
import { assessReadiness } from '../ml/validation/readiness'

const metrics: ValidationMetrics = { count: 24, logLoss: .51, accuracy: .7, brier: .18, baselineLogLoss: .64, randomLogLoss: Math.log(2), beatsBaseline: true, folds: 3, foldWins: 3 }
const base: ChoiceEvent = { id: '0', colorA: { l: .6, c: .1, h: 20 }, colorB: { l: .7, c: .12, h: 210 }, chosen: 'a', timestamp: 1, localHour: 1, weekday: 1, elapsedSinceStartMs: 1, reactionTimeMs: 1, leftColor: 'a', modelVersion: 1, pairType: 'normal', distance: .2 }

describe('engineering readiness', () => {
  it('requires repeated future wins, consistent controls, challenge support, and ensemble agreement', () => {
    const choices: ChoiceEvent[] = Array.from({ length: 56 }, (_, i) => ({ ...base, id: String(i), timestamp: i + 1, colorA: { ...base.colorA, h: i }, colorB: { ...base.colorB, h: 180 + i } }))
    const reference = choices[2]
    choices.push({ ...reference, id: 'control-1', timestamp: 100, pairType: 'repeated-control' })
    choices.push({ ...reference, id: 'control-2', timestamp: 101, pairType: 'repeated-control' })
    choices.push({ ...reference, id: 'challenge', timestamp: 102, pairType: 'local-challenge', chosen: 'a' })
    expect(assessReadiness(choices, metrics, .08).state).toBe('Ready')
    expect(assessReadiness(choices, { ...metrics, foldWins: 1 }, .08).state).toBe('Testing candidate')
    expect(assessReadiness(choices.filter(x => x.pairType !== 'local-challenge'), metrics, .08).state).toBe('Testing candidate')
  })
})
