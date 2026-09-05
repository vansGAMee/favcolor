import type { OKLCH } from '../app/types'
import { translate, type Language } from '../app/i18n'
import { colorCss, colorToHex } from '../color/color'

export function ResultReadyNotice({ color, language, onOpen }: { color: OKLCH; language: Language; onOpen: () => void }) {
  const t = (english: string, russian: string) => translate(language, english, russian)
  const hex = colorToHex(color)
  return <aside className="result-ready-notice" role="status" aria-live="polite" aria-label={t('Your color is ready to view', 'Ваш цвет уже можно посмотреть')}>
    <i style={{ backgroundColor: colorCss(color) }} />
    <span><strong>{t('Your color is ready to view', 'Ваш цвет уже можно посмотреть')}</strong><small>{t('You can stop now or keep going to refine the shade.', 'Можно остановиться сейчас или продолжить, чтобы уточнить оттенок.')} <b>{hex}</b></small></span>
    <button type="button" onClick={onOpen}>{t('Open my color', 'Открыть мой цвет')}<b aria-hidden="true">→</b></button>
  </aside>
}
