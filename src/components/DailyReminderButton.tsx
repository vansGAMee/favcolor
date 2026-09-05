import { useState } from 'react'
import { translate, type Language } from '../app/i18n'

const REMINDER_KEY = 'favcolor-daily-reminder-v1'
const DAY_MS = 86_400_000

type PeriodicSync = {
  register: (tag: string, options: { minInterval: number }) => Promise<void>
  unregister: (tag: string) => Promise<void>
}

const reminderWasEnabled = () => {
  try { return localStorage.getItem(REMINDER_KEY) === 'enabled' }
  catch { return false }
}

export function DailyReminderButton({ language }: { language: Language }) {
  const t = (english: string, russian: string) => translate(language, english, russian)
  const [enabled, setEnabled] = useState(reminderWasEnabled)
  const [status, setStatus] = useState('')

  const toggle = async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setStatus(t('Background reminders are not supported by this browser.', 'Этот браузер не поддерживает фоновые напоминания.'))
      return
    }
    try {
      const registration = await navigator.serviceWorker.register('/daily-reminder-sw.js')
      const periodicSync = (registration as ServiceWorkerRegistration & { periodicSync?: PeriodicSync }).periodicSync
      if (!periodicSync) {
        setStatus(t('Background reminders are not supported by this browser.', 'Этот браузер не поддерживает фоновые напоминания.'))
        return
      }
      if (enabled) {
        await Promise.all(['favcolor-daily-color-ru', 'favcolor-daily-color-en'].map(tag => periodicSync.unregister(tag)))
        localStorage.removeItem(REMINDER_KEY)
        setEnabled(false)
        setStatus(t('Reminders are off', 'Напоминания выключены'))
        return
      }
      const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission()
      if (permission !== 'granted') {
        setStatus(t('Permission was not granted.', 'Разрешение не предоставлено.'))
        return
      }
      await periodicSync.register(`favcolor-daily-color-${language}`, { minInterval: DAY_MS })
      localStorage.setItem(REMINDER_KEY, 'enabled')
      setEnabled(true)
      setStatus(t('Reminders enabled', 'Напоминания включены'))
    } catch {
      setStatus(t('Could not enable reminders in this browser.', 'Не удалось включить напоминания в этом браузере.'))
    }
  }

  return <div className="daily-reminder">
    <button type="button" onClick={() => void toggle()} aria-label={enabled ? t('Turn off browser reminders', 'Выключить браузерные напоминания') : t('Enable browser reminders', 'Включить браузерные напоминания')}>
      {enabled ? t('Turn off reminders', 'Выключить напоминания') : t('Subscribe to reminders', 'Подписаться на напоминания')}
    </button>
    <span role="status">{status}</span>
  </div>
}
