import { useState } from 'react'
import type { ReturnTypeOfColorModel } from './types'
import { russianChoiceWord, translate, type Language } from '../app/i18n'
import { colorCss, colorToHex } from '../color/color'

export function Discover({ model, language }: { model: ReturnTypeOfColorModel; language: Language }) {
  const t = (english: string, russian: string) => translate(language, english, russian)
  const blind = model.pair.type === 'validation' || model.pair.type === 'repeated-control'
  const [choiceMotion, setChoiceMotion] = useState<{ pair: ReturnTypeOfColorModel['pair']; index: number } | null>(null)
  const chosen = choiceMotion?.pair === model.pair ? choiceMotion.index : null
  const committedChoiceCount = model.busy ? Math.max(0, model.choices.length - 1) : model.choices.length
  const answerLabel = language === 'ru' ? russianChoiceWord(committedChoiceCount) : committedChoiceCount === 1 ? 'answer' : 'answers'
  const stage = model.choices.length < 16 ? t('Getting to know you', 'Знакомимся с вами') : model.choices.length < 50 ? t('Learning your taste', 'Изучаем ваш вкус') : t('Refining your color', 'Уточняем ваш цвет')
  const notice = language === 'ru' ? model.notice.replace('All learning stays on this device.', 'Все данные остаются на устройстве.').replace('Choice recorded', 'Выбор сохранён').replace('Local archive imported.', 'Архив загружен.').replace('Local data reset.', 'Локальные данные удалены.') : model.notice

  return <main className="discover" id="discover-panel" role="tabpanel" aria-labelledby="discover-tab">
    <section className="discover-copy">
      <div><p className="eyebrow">{t('Your personal color', 'Ваш личный цвет')}</p><h1>{t('Which color feels', 'Какой цвет вам')}<br />{t('more like you?', 'ближе?')}</h1></div>
      <div className="study-status"><span className="status-kicker"><i />{stage}</span><span className="choice-count" key={committedChoiceCount}><strong>{committedChoiceCount}</strong> {answerLabel}</span></div>
    </section>
    <section className="comparison" aria-label={t('Choose the color you prefer', 'Выберите цвет, который нравится больше')}>
      {model.pair.displayed.map((color, index) => <button
        className={`color-card${chosen === index ? ' is-chosen' : ''}${chosen !== null && chosen !== index ? ' is-dismissed' : ''}`}
        type="button"
        key={`${color.l}-${color.c}-${color.h}-${model.choices.length}-${index}`}
        aria-label={`${t('Choose', 'Выбрать')} ${blind ? `${t('color', 'цвет')} ${index + 1}` : colorToHex(color)}`}
        disabled={model.busy}
        onClick={() => { setChoiceMotion({ pair: model.pair, index }); void model.choose(index as 0 | 1) }}
      >
        <span className="swatch" style={{ backgroundColor: colorCss(color) }} />
        <span className="color-meta">
          <span className="option-index">0{index + 1}</span>
          <span className="color-code">{blind ? t('Code hidden', 'Код скрыт') : colorToHex(color)}</span>
          <span className="choose-label">{t('Choose', 'Выбрать')} <span aria-hidden="true">→</span></span>
        </span>
      </button>)}
      <span className="versus" aria-hidden="true">{t('or', 'или')}</span>
    </section>
    <footer className="choice-footer"><span className="notice-change" key={notice}>{notice}</span><span>{blind ? t('Consistency check', 'Проверка постоянства') : t('Trust your first reaction', 'Доверьтесь первой реакции')}</span></footer>
  </main>
}
