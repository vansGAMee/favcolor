import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from '../App'
import { ColorDatabase } from '../storage/db'

describe('product flow', () => {
  beforeEach(async () => {
    await new ColorDatabase('your-color').reset()
    localStorage.clear()
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
})
