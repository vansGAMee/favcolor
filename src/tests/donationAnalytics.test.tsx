import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../App'
import { DISPLAY_CHECK_KEY } from '../components/DisplayCheck'

const analytics = vi.hoisted(() => ({ trackDonationEvent: vi.fn(), trackFullStatsEvent: vi.fn(), trackPageView: vi.fn() }))

vi.mock('../analytics/posthog', () => analytics)
vi.mock('../app/useColorModel', () => ({
  useColorModel: () => ({
    choices: Array.from({ length: 250 }, (_, index) => ({
      id: String(index), colorA: { l: .62, c: .18, h: 280 }, colorB: { l: .67, c: .16, h: 35 },
      chosen: 'a', timestamp: index, localHour: 12, weekday: 2, elapsedSinceStartMs: index,
      reactionTimeMs: 500, leftColor: 'a', modelVersion: 2, pairType: 'normal', distance: .2,
    })),
    snapshots: [],
    pair: { canonical: [{ l: .62, c: .18, h: 280 }, { l: .67, c: .16, h: 35 }], displayed: [{ l: .62, c: .18, h: 280 }, { l: .67, c: .16, h: 35 }], leftColor: 'a', type: 'normal', startedAt: 0 },
    estimate: { l: .62, c: .18, h: 280 }, spread: .04, metrics: null, busy: false, hydrated: true,
    notice: '', error: null, contextActive: false, driftActive: false, modelState: 'Ready',
    readiness: { state: 'Ready', controlCount: 0, controlConsistency: null, challengeCount: 0, challengeWinRate: null, coverage: { hueBins: 8, lightnessBins: 3, chromaBins: 3, ready: true } },
    choose: vi.fn(), exportData: vi.fn(), importData: vi.fn(), reset: vi.fn(),
  }),
}))

describe('donation analytics', () => {
  beforeEach(() => {
    analytics.trackDonationEvent.mockClear()
    analytics.trackPageView.mockClear()
    analytics.trackFullStatsEvent.mockClear()
    localStorage.clear()
    sessionStorage.clear()
    localStorage.setItem(DISPLAY_CHECK_KEY, 'complete')
    localStorage.setItem('favcolor-language', 'ru')
  })

  it('tracks result, visible support locations and clicks without color data', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('tab', { name: 'Мой цвет' }))
    expect(analytics.trackDonationEvent).toHaveBeenCalledWith({
      name: 'result_viewed', properties: { comparisons: 250, pathname: '/' },
    })
    expect(analytics.trackDonationEvent).toHaveBeenCalledWith({
      name: 'support_250_shown', properties: { comparisons: 250, pathname: '/' },
    })
    expect(analytics.trackDonationEvent).toHaveBeenCalledWith({
      name: 'support_seen', properties: { location: 'notification_250', comparisons: 250, pathname: '/' },
    })
    expect(analytics.trackDonationEvent).toHaveBeenCalledWith({
      name: 'support_seen', properties: { location: 'result_card', comparisons: 250, pathname: '/' },
    })

    const prompt = screen.getByRole('complementary', { name: 'Поддержать Favcolor' })
    await user.click(within(prompt).getByRole('link', { name: 'На чай' }))
    expect(analytics.trackDonationEvent).toHaveBeenCalledWith({
      name: 'support_clicked', properties: { location: 'notification_250', comparisons: 250, pathname: '/' },
    })

    const serialized = JSON.stringify(analytics.trackDonationEvent.mock.calls)
    expect(serialized).not.toMatch(/#[0-9a-f]{6}|oklch|colorA|colorB/i)
  })
})
