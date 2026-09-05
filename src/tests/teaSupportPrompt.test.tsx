import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../App'
import { DISPLAY_CHECK_KEY } from '../components/DisplayCheck'

const modelState = vi.hoisted(() => ({ choiceCount: 250 }))

vi.mock('../app/useColorModel', () => ({
  useColorModel: () => ({
    choices: Array.from({ length: modelState.choiceCount }, (_, index) => ({
      id: String(index),
      colorA: { l: .62, c: .18, h: 280 },
      colorB: { l: .67, c: .16, h: 35 },
      chosen: index % 2 ? 'a' : 'b',
      timestamp: 1_700_000_000_000 + index,
      localHour: 12,
      weekday: 2,
      elapsedSinceStartMs: index * 1_000,
      reactionTimeMs: 500,
      leftColor: 'a',
      modelVersion: 2,
      pairType: 'normal',
      distance: .2,
    })),
    snapshots: [],
    pair: {
      canonical: [{ l: .62, c: .18, h: 280 }, { l: .67, c: .16, h: 35 }],
      displayed: [{ l: .62, c: .18, h: 280 }, { l: .67, c: .16, h: 35 }],
      leftColor: 'a',
      type: 'normal',
      startedAt: 0,
    },
    estimate: { l: .62, c: .18, h: 280 },
    spread: .04,
    metrics: null,
    busy: false,
    hydrated: true,
    notice: 'All learning stays on this device.',
    error: null,
    contextActive: false,
    driftActive: false,
    modelState: 'Ready',
    readiness: {
      state: 'Ready', controlCount: 0, controlConsistency: null, challengeCount: 0,
      challengeWinRate: null, coverage: { hueBins: 8, lightnessBins: 3, chromaBins: 3, ready: true },
    },
    choose: vi.fn(), exportData: vi.fn(), importData: vi.fn(), reset: vi.fn(),
  }),
}))

describe('tea support prompt', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    localStorage.setItem(DISPLAY_CHECK_KEY, 'complete')
    localStorage.setItem('favcolor-language', 'ru')
    modelState.choiceCount = 250
  })

  it('appears on My color at 250 choices and stays dismissed for the session', async () => {
    const user = userEvent.setup()
    modelState.choiceCount = 249
    const view = render(<App />)
    await user.click(screen.getByRole('tab', { name: 'Мой цвет' }))
    expect(screen.queryByText(/угостить проект чаем/i)).not.toBeInTheDocument()

    modelState.choiceCount = 250
    view.rerender(<App />)
    expect(screen.getByText(/угостить проект чаем/i)).toBeInTheDocument()
    await user.click(within(screen.getByRole('complementary', { name: 'Поддержать Favcolor' })).getByRole('button', { name: 'Не сейчас' }))
    expect(screen.queryByText(/угостить проект чаем/i)).not.toBeInTheDocument()

    view.unmount()
    render(<App />)
    await user.click(screen.getByRole('tab', { name: 'Мой цвет' }))
    expect(screen.queryByText(/угостить проект чаем/i)).not.toBeInTheDocument()
  })

  it('uses the verified CloudTips link without exposing the current page', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('tab', { name: 'Мой цвет' }))
    const link = screen.getByRole('link', { name: 'На чай' })
    expect(link).toHaveAttribute('href', 'https://pay.cloudtips.ru/p/1c756a9c')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noreferrer')
  })
})
