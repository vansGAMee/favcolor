import { useState } from 'react'
import type { ReturnTypeOfColorModel } from './types'
import { russianChoiceWord, translate, type Language } from '../app/i18n'
import { colorCss, colorToHex } from '../color/color'
import { ResultReadyNotice } from './ResultReadyNotice'

export function Discover({ model, language, showReadyResult = false, onOpenResult = () => {} }: { model: ReturnTypeOfColorModel; language: Language; showReadyResult?: boolean; onOpenResult?: () => void }) {
  const t = (english: string, russian: string) => translate(language, english, russian)
  const blind = model.pair.type === 'validation' || model.pair.type === 'repeated-control'
  const [choiceMotion, setChoiceMotion] = useState<{ pair: ReturnTypeOfColorModel['pair']; index: number } | null>(null)
  const [revealedCodes, setRevealedCodes] = useState<{ pair: ReturnTypeOfColorModel['pair']; indexes: number[] } | null>(null)
  const chosen = choiceMotion?.pair === model.pair ? choiceMotion.index : null
  const committedChoiceCount = model.busy ? Math.max(0, model.choices.length - 1) : model.choices.length
  const answerLabel = language === 'ru' ? russianChoiceWord(committedChoiceCount) : committedChoiceCount === 1 ? 'answer' : 'answers'
  const stage = model.choices.length < 16 ? t('Getting to know you', 'Знакомимся с вами') : model.choices.length < 50 ? t('Learning your taste', 'Изучаем ваш вкус') : t('Refining your color', 'Уточняем ваш цвет')
  const notice = language === 'ru' ? model.notice.replace('All learning stays on this device.', 'Все данные остаются на устройстве.').replace('Choice recorded', 'Выбор сохранён').replace('Local archive imported.', 'Архив загружен.').replace('Local data reset.', 'Локальные данные удалены.') : model.notice
  const chooseColor = (index: 0 | 1) => {
    if (model.busy) return
    setChoiceMotion({ pair: model.pair, index })
    void model.choose(index)
  }

  return <main className="discover" id="discover-panel" role="tabpanel" aria-labelledby="discover-tab">
    <section className="discover-copy">
      <div><p className="eyebrow">{t('Your personal color', 'Ваш личный цвет')}</p><h1>{t('Which color feels', 'Какой цвет вам')}<br />{t('more like you?', 'ближе?')}</h1></div>
      <div className="study-status"><span className="status-kicker"><i />{stage}</span><span className="choice-count" key={committedChoiceCount}><strong>{committedChoiceCount}</strong> {answerLabel}</span></div>
    </section>
    {showReadyResult && <ResultReadyNotice color={model.estimate} language={language} onOpen={onOpenResult} />}
    <section className="comparison" aria-label={t('Choose the color you prefer', 'Выберите цвет, который нравится больше')}>
      {model.pair.displayed.map((color, index) => {
        const revealed = revealedCodes?.pair === model.pair && revealedCodes.indexes.includes(index)
        const showCode = !blind || revealed
        return <div
          className={`color-card${chosen === index ? ' is-chosen' : ''}${chosen !== null && chosen !== index ? ' is-dismissed' : ''}`}
          key={`${color.l}-${color.c}-${color.h}-${model.choices.length}-${index}`}
          role="button"
          tabIndex={model.busy ? -1 : 0}
          aria-disabled={model.busy}
          aria-label={`${t('Choose', 'Выбрать')} ${showCode ? colorToHex(color) : `${t('color', 'цвет')} ${index + 1}`}`}
          onClick={() => chooseColor(index as 0 | 1)}
          onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); chooseColor(index as 0 | 1) } }}
        >
          <span className="swatch" style={{ backgroundColor: colorCss(color) }} />
          <span className="color-meta">
            <span className="option-index">0{index + 1}</span>
            {showCode ? <span className="color-code">{colorToHex(color)}</span> : <button
              type="button"
              className="color-code reveal-code"
              aria-label={t('Show color code', 'Показать код цвета')}
              onClick={event => {
                event.stopPropagation()
                setRevealedCodes(current => ({ pair: model.pair, indexes: current?.pair === model.pair ? [...new Set([...current.indexes, index])] : [index] }))
              }}
              onKeyDown={event => event.stopPropagation()}
            >{t('Show code', 'Показать код')}</button>}
            <span className="choose-label">{t('Choose', 'Выбрать')} <span aria-hidden="true">→</span></span>
          </span>
        </div>
      })}
      <span className="versus" aria-hidden="true">{t('or', 'или')}</span>
    </section>
    <footer className="choice-footer"><span className="notice-change" key={notice}>{notice}</span><span>{blind ? t('Consistency check', 'Проверка постоянства') : t('Trust your first reaction', 'Доверьтесь первой реакции')}</span></footer>
  </main>
}
