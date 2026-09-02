import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { TrainingPrompt } from '../components/TrainingPrompt'
import { setTrainingSharing, trainingSharingEnabled } from '../data/trainingCollection'

describe('training sharing prompt', () => {
  beforeEach(() => localStorage.clear())

  it('appears at 150 choices only while sharing is off', () => {
    const { rerender } = render(<TrainingPrompt choiceCount={149} sharingEnabled={false} onHelp={() => undefined} />)
    expect(screen.queryByText('Уже 150 выборов :)')).not.toBeInTheDocument()
    rerender(<TrainingPrompt choiceCount={150} sharingEnabled={false} onHelp={() => undefined} />)
    expect(screen.getByText('Уже 150 выборов :)')).toBeInTheDocument()
    rerender(<TrainingPrompt choiceCount={150} sharingEnabled onHelp={() => undefined} />)
    expect(screen.queryByText('Уже 150 выборов :)')).not.toBeInTheDocument()
  })

  it('does not appear when sharing was already enabled', () => {
    render(<TrainingPrompt choiceCount={150} sharingEnabled onHelp={() => undefined} />)
    expect(screen.queryByText('Уже 150 выборов :)')).not.toBeInTheDocument()
  })

  it('enables the existing opt-in when Help is chosen', async () => {
    const user = userEvent.setup()
    render(<TrainingPrompt choiceCount={150} sharingEnabled={false} onHelp={() => setTrainingSharing(true)} />)
    await user.click(screen.getByRole('button', { name: 'Помочь' }))
    expect(trainingSharingEnabled()).toBe(true)
    expect(screen.queryByText('Уже 150 выборов :)')).not.toBeInTheDocument()
  })

  it('closes for the rest of the session when Not now is chosen', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<TrainingPrompt choiceCount={150} sharingEnabled={false} onHelp={() => undefined} />)
    await user.click(screen.getByRole('button', { name: 'Не сейчас' }))
    rerender(<TrainingPrompt choiceCount={151} sharingEnabled={false} onHelp={() => undefined} />)
    expect(screen.queryByText('Уже 150 выборов :)')).not.toBeInTheDocument()
  })

  it('does not return after sharing is switched on and back off in the same session', () => {
    const { rerender } = render(<TrainingPrompt choiceCount={150} sharingEnabled={false} onHelp={() => undefined} />)
    expect(screen.getByText('Уже 150 выборов :)')).toBeInTheDocument()
    rerender(<TrainingPrompt choiceCount={150} sharingEnabled onHelp={() => undefined} />)
    rerender(<TrainingPrompt choiceCount={150} sharingEnabled={false} onHelp={() => undefined} />)
    expect(screen.queryByText('Уже 150 выборов :)')).not.toBeInTheDocument()
  })
})
