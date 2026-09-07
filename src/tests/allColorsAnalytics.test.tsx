import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChoiceEvent, OKLCH } from '../app/types'
import { buildColorAtlas, buildFavoriteColors } from '../analytics/colorAtlas'
import { AllColorsAnalytics } from '../components/AllColorsAnalytics'

const analytics = vi.hoisted(() => ({ trackFullStatsEvent: vi.fn() }))
vi.mock('../analytics/posthog', () => analytics)

const event = (id: string, colorA: OKLCH, colorB: OKLCH, chosen: 'a' | 'b'): ChoiceEvent => ({
  id, colorA, colorB, chosen, timestamp: Number(id), localHour: 12, weekday: 1,
  elapsedSinceStartMs: Number(id), reactionTimeMs: 500, leftColor: 'a',
  modelVersion: 2, pairType: 'normal', distance: .2,
})

const choices = [
  event('1', { l: .62, c: .2, h: 5 }, { l: .64, c: .18, h: 245 }, 'a'),
  event('2', { l: .66, c: .17, h: 20 }, { l: .58, c: .19, h: 295 }, 'b'),
  event('3', { l: .72, c: .03, h: 40 }, { l: .61, c: .2, h: 130 }, 'b'),
  event('4', { l: .57, c: .16, h: 250 }, { l: .68, c: .12, h: 260 }, 'a'),
]

describe('all-color statistics', () => {
  afterEach(() => vi.restoreAllMocks())
  beforeEach(() => {
    localStorage.clear()
    analytics.trackFullStatsEvent.mockClear()
    window.yaContextCb = []
  })

  it('summarizes every color family from cross-family choices without treating same-family pairs as wins', () => {
    const atlas = buildColorAtlas(choices)
    expect(atlas.totalComparisons).toBe(4)
    expect(atlas.uniqueRenderedColors).toBe(8)
    expect(atlas.families).toHaveLength(9)
    expect(atlas.families.find(family => family.key === 'red')).toMatchObject({ crossFamilyWins: 1, crossFamilyComparisons: 1, exposures: 1 })
    expect(atlas.families.find(family => family.key === 'blue')).toMatchObject({ crossFamilyWins: 0, crossFamilyComparisons: 1, exposures: 3 })
    expect(atlas.families.find(family => family.key === 'neutral')).toMatchObject({ crossFamilyWins: 0, crossFamilyComparisons: 1, exposures: 1 })
    expect(atlas.coveredFamilies).toBe(6)
    expect(atlas.chosenShades).toHaveLength(4)
    expect(atlas.chosenShades.every(shade => /^#[0-9a-f]{6}$/.test(shade.hex))).toBe(true)
    expect(atlas.recentChosenHexes).toHaveLength(4)
  })

  it('collects repeatedly preferred distinct colors and requires stronger evidence for a shade of the primary hue', () => {
    const redWins = Array.from({ length: 3 }, (_, index) => event(`1${index}`, { l: .58, c: .2, h: 20 }, { l: .6, c: .17, h: 210 }, 'a'))
    const greenWins = Array.from({ length: 3 }, (_, index) => event(`2${index}`, { l: .6, c: .18, h: 135 }, { l: .64, c: .16, h: 60 }, 'a'))
    const lightPurpleWins = Array.from({ length: 4 }, (_, index) => event(`3${index}`, { l: .8, c: .2, h: 300 }, { l: .78, c: .1, h: 300 }, 'a'))
    const favorites = buildFavoriteColors([...redWins, ...greenWins, ...lightPurpleWins], { l: .58, c: .19, h: 295 })
    expect(favorites.some(item => item.color.h < 40 && item.kind === 'color')).toBe(true)
    expect(favorites.some(item => item.color.h > 110 && item.color.h < 160 && item.kind === 'color')).toBe(true)
    expect(favorites.some(item => item.color.h > 280 && item.kind === 'shade')).toBe(true)
  })

  it('unlocks the complete free statistics and keeps them visible after declining support', async () => {
    const user = userEvent.setup()
    render(<AllColorsAnalytics choices={choices} language="ru" openSignal={0} />)

    await user.click(screen.getByRole('button', { name: 'Открыть полный разбор бесплатно' }))
    expect(screen.getByRole('region', { name: 'Статистика по всем цветам' })).toBeVisible()
    expect(screen.getByText('Выбранные оттенки')).toBeVisible()
    expect(screen.getAllByText(/^#[0-9a-f]{6}$/i).length).toBeGreaterThan(0)
    expect(screen.getByRole('dialog', { name: 'Статистика готова' })).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Не сейчас' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Статистика по всем цветам' })).toBeVisible()
    expect(localStorage.getItem('favcolor-full-stats-unlocked-v3')).toBe('yes')
    expect(localStorage.getItem('favcolor-full-stats-support-seen-v3')).toBe('yes')
    expect(analytics.trackFullStatsEvent).toHaveBeenCalledWith({ name: 'full_stats_support_dismissed', properties: { reason: 'skip', comparisons: 4, pathname: '/' } })
  })

  it('shows support only after the unlocked report has rendered successfully', async () => {
    const frames: FrameRequestCallback[] = []
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frames.push(callback); return frames.length })
    render(<AllColorsAnalytics choices={choices} language="ru" />)

    fireEvent.click(screen.getByRole('button', { name: 'Открыть полный разбор бесплатно' }))
    expect(screen.getByRole('region', { name: 'Статистика по всем цветам' })).toBeVisible()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await act(async () => { frames.splice(0).forEach(callback => callback(performance.now())) })
    expect(screen.getByRole('dialog', { name: 'Статистика готова' })).toBeVisible()
  })

  it('does not show the support dialog again and closes it with Escape when first shown', async () => {
    const user = userEvent.setup()
    const first = render(<AllColorsAnalytics choices={choices} language="ru" openSignal={0} />)
    await user.click(screen.getByRole('button', { name: 'Открыть полный разбор бесплатно' }))
    await screen.findByRole('dialog', { name: 'Статистика готова' })
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    first.unmount()

    render(<AllColorsAnalytics choices={choices} language="ru" openSignal={0} />)
    expect(screen.getByRole('region', { name: 'Статистика по всем цветам' })).toBeVisible()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('uses the existing CloudTips destination and tracks open, modal, donation and skip without color data', async () => {
    const user = userEvent.setup()
    render(<AllColorsAnalytics choices={choices} language="ru" openSignal={0} />)
    await user.click(screen.getByRole('button', { name: 'Открыть полный разбор бесплатно' }))

    const fixed = await screen.findByRole('link', { name: 'Поддержать на 100 ₽' })
    const other = screen.getByRole('link', { name: 'Другая сумма' })
    expect(fixed).toHaveAttribute('href', 'https://pay.cloudtips.ru/p/1c756a9c')
    expect(other).toHaveAttribute('href', 'https://pay.cloudtips.ru/p/1c756a9c')
    await user.click(fixed)

    expect(analytics.trackFullStatsEvent).toHaveBeenCalledWith({ name: 'full_stats_opened', properties: { comparisons: 4, pathname: '/' } })
    expect(analytics.trackFullStatsEvent).toHaveBeenCalledWith({ name: 'full_stats_support_shown', properties: { comparisons: 4, pathname: '/' } })
    expect(analytics.trackFullStatsEvent).toHaveBeenCalledWith({ name: 'full_stats_support_clicked', properties: { option: '100', comparisons: 4, pathname: '/' } })
    expect(JSON.stringify(analytics.trackFullStatsEvent.mock.calls)).not.toMatch(/#[0-9a-f]{6}|oklch|colorA|colorB/i)
  })

  it('opens the report immediately and support after the report renders', async () => {
    const view = render(<AllColorsAnalytics choices={choices} language="ru" openSignal={0} />)
    view.rerender(<AllColorsAnalytics choices={choices} language="ru" openSignal={1} />)
    expect(screen.getByRole('region', { name: 'Статистика по всем цветам' })).toBeVisible()
    expect(await screen.findByRole('dialog', { name: 'Статистика готова' })).toBeVisible()
  })

  it('does not request advertising before the free report is opened', async () => {
    const user = userEvent.setup()
    render(<AllColorsAnalytics choices={choices} language="ru" />)
    expect(window.yaContextCb).toHaveLength(0)

    await user.click(screen.getByRole('button', { name: 'Открыть полный разбор бесплатно' }))
    expect(window.yaContextCb).toHaveLength(1)
    expect(document.querySelector('#yandex_rtb_R-A-19998600-1')).toBeInTheDocument()
  })
})
