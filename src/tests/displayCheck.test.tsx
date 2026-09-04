import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from '../App'
import type { ChoiceEvent } from '../app/types'
import { ColorDatabase } from '../storage/db'

const existingChoice: ChoiceEvent = {
  id: 'existing', colorA: { l: .55, c: .14, h: 20 }, colorB: { l: .65, c: .16, h: 210 }, chosen: 'a',
  timestamp: 1_700_000_000_000, localHour: 12, weekday: 2, elapsedSinceStartMs: 5_000,
  reactionTimeMs: 450, leftColor: 'a', modelVersion: 2, pairType: 'normal', distance: .2,
}

describe('first-run display check', () => {
  beforeEach(async () => {
    await new ColorDatabase('your-color').reset()
    localStorage.clear()
  })

  it('shows before the first preference and completion prevents it on reload', async () => {
    const user = userEvent.setup()
    const first = render(<App />)
    expect(await screen.findByRole('heading', { name: /display check|проверка экрана/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /choose/i })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /continue|далее/i }))
    await user.click(screen.getByRole('button', { name: /done|готово/i }))
    await waitFor(() => expect(screen.queryByRole('heading', { name: /display check|проверка экрана/i })).not.toBeInTheDocument())
    expect(await new ColorDatabase('your-color').getChoices()).toHaveLength(0)
    first.unmount()

    render(<App />)
    expect(await screen.findAllByRole('button', { name: /choose/i })).toHaveLength(2)
    expect(screen.queryByRole('heading', { name: /display check|проверка экрана/i })).not.toBeInTheDocument()
  })

  it('states the limitation and gives corrective feedback instead of claiming calibration', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(await screen.findByText(/cannot make colors identical|не может сделать цвета одинаковыми/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /some merge together|часть сливается/i }))
    expect(screen.getByText(/lower screen brightness|уменьшите яркость/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /continue|далее/i }))
    await user.click(screen.getByRole('button', { name: /gray looks tinted|серый имеет оттенок/i }))
    expect(screen.getByRole('status')).toHaveTextContent(/disable night light|отключите ночной режим/i)
  })

  it('includes practical OLED guidance without claiming automatic correction', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByText(/using an oled screen|если у вас oled/i))
    expect(screen.getByText(/standard.*srgb|стандартный.*srgb/i)).toBeInTheDocument()
    expect(screen.getByText(/fixed.*brightness|фиксированную яркость/i)).toBeInTheDocument()
  })

  it('skip persists and existing choices bypass the check', async () => {
    const user = userEvent.setup()
    const first = render(<App />)
    await screen.findByRole('heading', { name: /display check|проверка экрана/i })
    await user.click(screen.getByRole('button', { name: /skip|пропустить/i }))
    first.unmount()
    render(<App />)
    expect(await screen.findAllByRole('button', { name: /choose/i })).toHaveLength(2)
  })

  it('never blocks an existing user after update', async () => {
    await new ColorDatabase('your-color').addChoice(existingChoice)
    render(<App />)
    expect(await screen.findAllByRole('button', { name: /choose/i })).toHaveLength(2)
    expect(screen.queryByRole('heading', { name: /display check|проверка экрана/i })).not.toBeInTheDocument()
  })

  it('offers a voluntary display recheck without deleting history', async () => {
    const user = userEvent.setup()
    await new ColorDatabase('your-color').addChoice(existingChoice)
    render(<App />)
    await user.click(await screen.findByRole('tab', { name: 'You' }))
    await user.click(screen.getByRole('button', { name: /recheck display/i }))
    expect(screen.getByRole('heading', { name: /display check/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /skip/i }))
    expect(await new ColorDatabase('your-color').getChoices()).toHaveLength(1)
  })

  it('keeps elapsed model time monotonic after a reload', async () => {
    const user = userEvent.setup()
    await new ColorDatabase('your-color').addChoice({ ...existingChoice, elapsedSinceStartMs: 50_000 })
    render(<App />)
    await user.click((await screen.findAllByRole('button', { name: /choose/i }))[0])
    await waitFor(async () => {
      const saved = await new ColorDatabase('your-color').getChoices()
      expect(saved.at(-1)?.elapsedSinceStartMs).toBeGreaterThanOrEqual(50_000)
    })
  })

  it('does not expose preference controls before IndexedDB hydration finishes', () => {
    render(<App />)
    expect(screen.queryByRole('button', { name: /choose/i })).not.toBeInTheDocument()
  })
})
