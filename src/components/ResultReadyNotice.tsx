import type { OKLCH } from '../app/types'
import { translate, type Language } from '../app/i18n'
import { colorCss, colorToHex } from '../color/color'

export function ResultReadyNotice({ color, language, onOpen }: { color: OKLCH; language: Language; onOpen: () => void }) {
  const t = (english: string, russian: string) => translate(language, english, russian)
  const hex = colorToHex(color)
  return <button className="result-ready-notice" onClick={onOpen} aria-label={t('Result is ready — open your color', 'Результат подобран — открыть свой цвет')}>
    <i style={{ backgroundColor: colorCss(color) }} />
    <span><strong>{t('Result is ready', 'Результат подобран')}</strong><small>{hex}</small></span>
    <b aria-hidden="true">→</b>
  </button>
}
