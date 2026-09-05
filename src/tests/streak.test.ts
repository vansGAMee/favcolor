import { describe, expect, it } from 'vitest'
import { calculateStreak } from '../app/streak'

const today = new Date(2026, 8, 5, 12)

describe('daily color streak', () => {
  it('counts one active day', () => {
    expect(calculateStreak(['2026-09-05'], today)).toMatchObject({ current: 1, longest: 1, hasToday: true })
  })

  it('counts four consecutive days', () => {
    expect(calculateStreak(['2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05'], today).current).toBe(4)
  })

  it('resets the current streak after a gap', () => {
    expect(calculateStreak(['2026-09-01', '2026-09-02'], today).current).toBe(0)
  })

  it('keeps the longest streak separate from the current streak', () => {
    expect(calculateStreak(['2026-08-28', '2026-08-29', '2026-08-30', '2026-09-04', '2026-09-05'], today)).toMatchObject({ current: 2, longest: 3 })
  })

  it('keeps a streak alive from yesterday when today is empty', () => {
    expect(calculateStreak(['2026-09-02', '2026-09-03', '2026-09-04'], today)).toMatchObject({ current: 3, longest: 3, hasToday: false, activeFromYesterday: true })
  })

  it('does not count duplicate snapshot dates twice', () => {
    expect(calculateStreak(['2026-09-03', '2026-09-04', '2026-09-04', '2026-09-05'], today)).toMatchObject({ current: 3, longest: 3 })
  })

  it('uses calendar days rather than elapsed UTC hours', () => {
    expect(calculateStreak(['2026-03-28', '2026-03-29', '2026-03-30'], new Date(2026, 2, 30, 0, 30)).current).toBe(3)
  })
})
