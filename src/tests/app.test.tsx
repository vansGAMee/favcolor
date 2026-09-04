import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from '../App'
import { ColorDatabase } from '../storage/db'
import { DISPLAY_CHECK_KEY } from '../components/DisplayCheck'

describe('product flow', () => {
  beforeEach(async () => {
    await new ColorDatabase('your-color').reset()
    localStorage.clear()
    localStorage.setItem(DISPLAY_CHECK_KEY, 'complete')
  })

  it('records one choice without submit and advances to a new pair', async () => {
    const user = userEvent.setup()
    render(<App />)
    const cards = await screen.findAllByRole('button', { name: /choose/i })
    const firstLabel = cards[0].getAttribute('aria-label')
    await user.click(cards[0])
    await waitFor(async () => expect(await new ColorDatabase('your-color').getChoices()).toHaveLength(1))
    await waitFor(() => expect(screen.getAllByRole('button', { name: /choose/i })[0].getAttribute('aria-label')).not.toBe(firstLabel))
  })

  it('reveals a hidden consistency-check code without recording a choice', async () => {
    const user = userEvent.setup()
    const database = new ColorDatabase('your-color')
    render(<App />)
    for (let count = 1; count <= 6; count++) {
      await user.click((await screen.findAllByRole('button', { name: /choose/i }))[0])
      await waitFor(async () => expect(await database.getChoices()).toHaveLength(count))
      await waitFor(() => expect(screen.getAllByRole('button', { name: /choose/i })[0]).toHaveAttribute('aria-disabled', 'false'))
    }
    const reveal = screen.getAllByRole('button', { name: /show color code/i })[0]
    await user.click(reveal)
    expect(screen.getAllByRole('button', { name: /choose #[0-9a-f]{6}/i })).toHaveLength(1)
    expect(await database.getChoices()).toHaveLength(6)
  })

  it('shows honest unavailable metrics and a real saved history day', async () => {
    const user = userEvent.setup()
    render(<App />)
    const cards = await screen.findAllByRole('button', { name: /choose/i })
    await user.click(cards[1])
    await waitFor(() => expect(screen.getByText(/choice recorded/i)).toBeInTheDocument())
    await user.click(screen.getByRole('tab', { name: 'You' }))
    expect(screen.getByRole('heading', { name: 'Taste profile' })).toBeInTheDocument()
    expect(screen.getAllByText(/not enough answers yet/i).length).toBeGreaterThan(0)
    expect(screen.queryByText(/93%/)).not.toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /estimated color for/i })).toBeInTheDocument()
  })

  it('switches the interface to Russian and remembers the choice', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Switch to Russian' }))
    expect(screen.getByRole('tab', { name: 'Выбор' })).toBeInTheDocument()
    expect(screen.getByText('Ваш личный цвет')).toBeInTheDocument()
    expect(localStorage.getItem('favcolor-language')).toBe('ru')
  })

  it('collects pre-answer prediction only after voluntary opt-in', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('tab', { name: 'You' }))
    const sharing = screen.getByRole('switch', { name: /help improve the model/i })
    expect(sharing).not.toBeChecked()
    await user.click(sharing)
    await user.click(screen.getByRole('tab', { name: 'Discover' }))
    await user.click((await screen.findAllByRole('button', { name: /choose/i }))[0])
    await waitFor(() => {
      const buffer = JSON.parse(localStorage.getItem('favcolor-training-buffer-v1') ?? '{}')
      expect(buffer.observations).toHaveLength(1)
      expect(buffer.observations[0].predictionA).toEqual(expect.any(Number))
    })
  })

  it('opens a separate methodology page with real results and honest boundaries', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('tab', { name: 'How it works' }))
    expect(screen.getByRole('heading', { name: /how favcolor learns/i })).toBeInTheDocument()
    expect(screen.getByText('Nikolai Dubovskoy')).toBeInTheDocument()
    expect(screen.getByText('8 / 8')).toBeInTheDocument()
    expect(screen.getByText(/synthetic users are software tests/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /development history/i })).toBeInTheDocument()
  })
})
