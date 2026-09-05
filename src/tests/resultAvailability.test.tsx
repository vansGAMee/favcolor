import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../App'
import { DISPLAY_CHECK_KEY } from '../components/DisplayCheck'
import { resultIsAvailable } from '../app/resultAvailability'

const modelState = vi.hoisted(() => ({ choiceCount: 31, estimate: { l: .62, c: .18, h: 280 }, reset: vi.fn() }))

vi.mock('../app/useColorModel', () => ({
  useColorModel: () => ({
    choices: Array.from({ length: modelState.choiceCount }, (_, index) => ({ id: String(index), colorA: { l: .62, c: .18, h: 280 }, colorB: { l: .67, c: .16, h: 35 }, chosen: 'a', timestamp: index, localHour: 12, weekday: 2, elapsedSinceStartMs: index, reactionTimeMs: 500, leftColor: 'a', modelVersion: 2, pairType: 'normal', distance: .2 })),
    snapshots: [], pair: { canonical: [{ l: .62, c: .18, h: 280 }, { l: .67, c: .16, h: 35 }], displayed: [{ l: .62, c: .18, h: 280 }, { l: .67, c: .16, h: 35 }], leftColor: 'a', type: 'normal', startedAt: 0 },
    estimate: modelState.estimate, spread: .08, metrics: null, busy: false, hydrated: true, notice: 'All learning stays on this device.', error: null, contextActive: false, driftActive: false, modelState: 'Narrowing', readiness: { state: 'Narrowing', controlCount: 0, controlConsistency: null, challengeCount: 0, challengeWinRate: null, coverage: { hueBins: 3, lightnessBins: 2, chromaBins: 2, ready: false } },
    choose: vi.fn(), exportData: vi.fn(), importData: vi.fn(), reset: modelState.reset,
  }),
}))

describe('available result UX', () => {
  beforeEach(() => {
    localStorage.clear(); sessionStorage.clear(); localStorage.setItem(DISPLAY_CHECK_KEY, 'complete'); localStorage.setItem('favcolor-language', 'ru')
    modelState.choiceCount = 31; modelState.estimate = { l: .62, c: .18, h: 280 }; modelState.reset.mockReset()
  })

  it('starts at 32 valid choices, independently from scientific Ready', () => {
    expect(resultIsAvailable(31, modelState.estimate)).toBe(false)
    expect(resultIsAvailable(32, modelState.estimate)).toBe(true)
    expect(resultIsAvailable(32, { l: Number.NaN, c: .1, h: 20 })).toBe(false)
  })

  it('persists opening across reload and resets availability acknowledgement for a new session', async () => {
    const user = userEvent.setup()
    const view = render(<App />)
    expect(screen.queryByRole('status', { name: /ваш цвет уже можно посмотреть/i })).not.toBeInTheDocument()

    modelState.choiceCount = 32; view.rerender(<App />)
    const notice = screen.getByRole('status', { name: /ваш цвет уже можно посмотреть/i })
    await user.click(screen.getByRole('button', { name: /открыть мой цвет/i }))
    expect(screen.getByRole('tab', { name: 'Мой цвет' })).toHaveAttribute('aria-selected', 'true')

    view.unmount(); const reloaded = render(<App />)
    await user.click(screen.getByRole('tab', { name: 'Выбор' }))
    expect(screen.queryByRole('status', { name: /ваш цвет уже можно посмотреть/i })).not.toBeInTheDocument()

    modelState.choiceCount = 0
    reloaded.rerender(<App />)
    modelState.choiceCount = 32; reloaded.rerender(<App />)
    expect(screen.getByRole('status', { name: /ваш цвет уже можно посмотреть/i })).toBeInTheDocument()
    expect(notice).not.toBeInTheDocument()
  })

  it('shows the current-result explanation and inline tea link only after availability', async () => {
    const user = userEvent.setup(); const view = render(<App />)
    await user.click(screen.getByRole('tab', { name: 'Мой цвет' }))
    expect(screen.queryByRole('link', { name: 'На чай' })).not.toBeInTheDocument()
    modelState.choiceCount = 32; view.rerender(<App />)
    expect(screen.getByText('Это уже ваш текущий результат. Новые ответы будут уточнять оттенок.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'На чай' })).toHaveAttribute('href', 'https://pay.cloudtips.ru/p/1c756a9c')
  })
})
