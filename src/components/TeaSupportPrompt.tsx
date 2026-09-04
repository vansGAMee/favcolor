import { useEffect, useState } from 'react'
import { translate, type Language } from '../app/i18n'

const TEA_PROMPT_SEEN_KEY = 'favcolor-tea-prompt-seen-v1'
const TEA_URL = 'https://pay.cloudtips.ru/p/1c756a9c'

const promptWasSeen = () => {
  try { return sessionStorage.getItem(TEA_PROMPT_SEEN_KEY) === 'seen' }
  catch { return false }
}

const rememberPrompt = () => {
  try { sessionStorage.setItem(TEA_PROMPT_SEEN_KEY, 'seen') }
  catch { /* The prompt can still be dismissed when storage is unavailable. */ }
}

export function TeaSupportPrompt({ choiceCount, language }: { choiceCount: number; language: Language }) {
  const [dismissed, setDismissed] = useState(promptWasSeen)
  const eligible = choiceCount >= 300 && !dismissed
  const t = (english: string, russian: string) => translate(language, english, russian)

  useEffect(() => {
    if (eligible) rememberPrompt()
  }, [eligible])

  if (!eligible) return null

  return <aside className="tea-prompt" aria-label={t('Support Favcolor', 'Поддержать Favcolor')}>
    <span className="tea-prompt-icon" aria-hidden="true">☕</span>
    <div className="tea-prompt-copy">
      <strong>{t('A small thank you', 'Небольшое спасибо')}</strong>
      <p>{t('If Favcolor was useful, you can buy the project a tea.', 'Если Favcolor оказался полезным, можно угостить проект чаем.')}</p>
    </div>
    <div className="tea-prompt-actions">
      <a href={TEA_URL} target="_blank" rel="noreferrer" onClick={() => setDismissed(true)}>{t('Buy tea', 'На чай')}</a>
      <button type="button" onClick={() => setDismissed(true)}>{t('Not now', 'Не сейчас')}</button>
    </div>
  </aside>
}
