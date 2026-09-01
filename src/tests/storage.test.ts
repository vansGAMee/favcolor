import { beforeEach, describe, expect, it } from 'vitest'
import { ColorDatabase } from '../storage/db'
import type { ChoiceEvent, DailySnapshot } from '../app/types'

const event: ChoiceEvent = {
  id: 'c1', colorA: { l: 0.6, c: 0.15, h: 20 }, colorB: { l: 0.7, c: 0.1, h: 220 }, chosen: 'a', timestamp: 1000,
  localHour: 12, weekday: 2, elapsedSinceStartMs: 5000, reactionTimeMs: 900, leftColor: 'a', modelVersion: 1, pairType: 'normal', distance: 0.3,
}
const snapshot: DailySnapshot = { date: '2026-09-01', color: event.colorA, hex: '#c06050', state: 'Learning', totalChoices: 1, validation: null }

describe('IndexedDB persistence', () => {
  beforeEach(async () => { await new ColorDatabase('test-color-db').reset() })

  it('survives reload and keeps one immutable snapshot per day', async () => {
    const first = new ColorDatabase('test-color-db')
    await first.addChoice(event)
    await first.saveSnapshot(snapshot)
    const second = new ColorDatabase('test-color-db')
    expect(await second.getChoices()).toEqual([event])
    expect(await second.getSnapshots()).toEqual([snapshot])
  })

  it('exports, imports, and resets schema-versioned data', async () => {
    const db = new ColorDatabase('test-color-db')
    await db.addChoice(event)
    const json = await db.exportJson()
    await db.reset()
    expect(await db.getChoices()).toHaveLength(0)
    await db.importJson(json)
    expect((await db.getChoices())[0].id).toBe('c1')
    await expect(db.importJson('{"schemaVersion":999}')).rejects.toThrow('Unsupported')
  })
})
