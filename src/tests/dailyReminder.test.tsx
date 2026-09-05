import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DailyReminderButton } from '../components/DailyReminderButton'

describe('voluntary daily browser reminder', () => {
  beforeEach(() => localStorage.clear())

  it('asks only after a click and registers a daily periodic reminder', async () => {
    const requestPermission = vi.fn().mockResolvedValue('granted')
    const registerPeriodic = vi.fn().mockResolvedValue(undefined)
    const serviceWorkerRegistration = { periodicSync: { register: registerPeriodic, unregister: vi.fn() } }
    Object.defineProperty(window, 'Notification', { configurable: true, value: { permission: 'default', requestPermission } })
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: {
      register: vi.fn().mockResolvedValue(serviceWorkerRegistration),
      ready: Promise.resolve(serviceWorkerRegistration),
    } })

    render(<DailyReminderButton language="ru" />)
    expect(requestPermission).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Включить браузерные напоминания' }))
    expect(requestPermission).toHaveBeenCalledOnce()
    expect(registerPeriodic).toHaveBeenCalledWith('favcolor-daily-color-ru', { minInterval: 86_400_000 })
    expect(screen.getByText('Напоминания включены')).toBeInTheDocument()
  })
})
