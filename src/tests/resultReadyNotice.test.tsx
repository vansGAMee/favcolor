import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ResultReadyNotice } from '../components/ResultReadyNotice'

describe('result-ready notice', () => {
  it('shows the result color and opens the result page once clicked', async () => {
    const open = vi.fn()
    render(<ResultReadyNotice color={{ l: 0, c: 0, h: 0 }} language="en" onOpen={open} />)
    const notice = screen.getByRole('status', { name: /your color is ready to view/i })
    expect(notice).toHaveAttribute('aria-live', 'polite')
    await userEvent.setup().click(screen.getByRole('button', { name: /open my color/i }))
    expect(open).toHaveBeenCalledTimes(1)
  })
})
