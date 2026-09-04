import type { CSSProperties } from 'react'
import { translate, type Language } from '../app/i18n'

export function SharedColor({ hex, language }: { hex: string; language: Language }) {
  const t = (english: string, russian: string) => translate(language, english, russian)
  return <main className="shared-color-page" style={{ '--shared-color': hex } as CSSProperties}>
    <section className="shared-color-card">
      <p className="eyebrow">Favcolor · {t('Public result', 'Публичный результат')}</p>
      <h1>{t('Shared color', 'Общий цвет')}</h1>
      <div className="shared-color-swatch" style={{ backgroundColor: hex }} />
      <strong>{hex.toUpperCase()}</strong>
      <p>{t('Only this color is encoded in the link. No choices, model, history, or private data are included.', 'В ссылке записан только этот цвет. Выборы, модель, история и личные данные в неё не входят.')}</p>
      <a href={window.location.pathname}>{t('Open Favcolor', 'Открыть Favcolor')} <span aria-hidden="true">→</span></a>
    </section>
  </main>
}
