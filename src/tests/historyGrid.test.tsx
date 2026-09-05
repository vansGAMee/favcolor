import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HistoryGrid } from '../components/HistoryGrid'
import type { DailySnapshot } from '../app/types'

const snapshot = (date: string, hex: string): DailySnapshot => ({
  date, hex, color: { l: .6, c: .16, h: 280 }, state: 'Learning', totalChoices: 32, validation: null,
})

describe('color diary explanation', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 5, 12))
  })
  afterEach(() => vi.useRealTimers())

  it('explains saved days and shows the calm streak summary', () => {
    render(<HistoryGrid language="ru" snapshots={[
      snapshot('2026-09-02', '#7445ef'), snapshot('2026-09-03', '#7850ed'), snapshot('2026-09-04', '#8058e8'),
    ]} />)
    expect(screen.getByText('🔥 3 дня подряд')).toBeInTheDocument()
    expect(screen.getByText('Лучший результат: 3 дня')).toBeInTheDocument()
    expect(screen.getByText('Сегодняшний цвет ещё не сохранён.')).toBeInTheDocument()
    expect(screen.getByText(/Каждый день сохраняется ваш текущий цвет/)).toBeInTheDocument()
    expect(screen.getByText('Заполнено — цвет сохранён')).toBeInTheDocument()
    expect(screen.getByText('Пусто — данных нет')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Включить браузерные напоминания' })).toBeInTheDocument()
  })
})
