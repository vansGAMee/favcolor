import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ResultReadyNotice } from '../components/ResultReadyNotice'

describe('result-ready notice', () => {
  it('shows the result color and opens the result page once clicked', async () => {
    const open = vi.fn()
    render(<ResultReadyNotice color={{ l: 0, c: 0, h: 0 }} language="en" onOpen={open} />)
    const notice = screen.getByRole('button', { name: /result is ready/i })
    expect(notice).toHaveTextContent('#000000')
    await userEvent.setup().click(notice)
    expect(open).toHaveBeenCalledTimes(1)
  })
})
