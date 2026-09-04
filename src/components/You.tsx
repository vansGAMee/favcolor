import { useRef, type CSSProperties } from 'react'
import type { ReturnTypeOfColorModel } from './types'
import { colorCss, colorToHex } from '../color/color'
import { HistoryGrid } from './HistoryGrid'
import { EvolutionChart } from './EvolutionChart'
import { TastePortrait } from './TastePortrait'
import { stateLabel, translate, type Language } from '../app/i18n'

const metric = (value: number | undefined, format = (x: number) => x.toFixed(3)) => value === undefined || !Number.isFinite(value) ? 'Not enough evidence yet' : format(value)

export function You({ model, language, sharing, onSharingChange, onRecheckDisplay }: { model: ReturnTypeOfColorModel; language: Language; sharing: boolean; onSharingChange: (enabled: boolean) => void; onRecheckDisplay: () => void }) {
  const t = (english: string, russian: string) => translate(language, english, russian)
  const input = useRef<HTMLInputElement>(null)
  const enough = (model.metrics?.count ?? 0) >= 8
  const estimateHex = colorToHex(model.estimate)
  const stable = model.modelState === 'Ready'
  const accuracy = enough && model.metrics?.accuracy !== undefined ? model.metrics.accuracy : null
  const loss = enough && model.metrics?.logLoss !== undefined ? model.metrics.logLoss : null
  return <main className="you" id="you-panel" role="tabpanel" aria-labelledby="you-tab">
    <div className="you-heading"><div><p className="eyebrow">{t('What the model has learned', 'Что узнала модель')}</p><h1>{t('Your color,', 'Ваш цвет')}<br />{t('made visible.', 'в деталях.')}</h1></div><p>{t('A living estimate built from your answers—not a personality quiz, and never uploaded.', 'Живой результат, основанный на ваших ответах. Это не тест личности, и данные никуда не отправляются.')}</p></div>
    <section className="profile-grid" style={{ '--estimate-color': estimateHex } as CSSProperties}>
      <article className="estimate-block">
        <div className="estimate-topline"><span>{stable ? t('Stable digital estimate', 'Стабильная цифровая оценка') : t('Current digital estimate', 'Текущая цифровая оценка')}</span><span className="state-pill"><i />{stateLabel(model.modelState, language)}</span></div>
        <div className="estimate-swatch" style={{ backgroundColor: colorCss(model.estimate) }}><span>{stable ? t('Your current color', 'Ваш текущий цвет') : t('Still learning', 'Ещё изучаем')}</span></div>
        <div className="estimate-details"><div><p className="eyebrow">{t('Current color', 'Текущий цвет')}</p><div className="estimate-hex">{estimateHex}</div></div><div className="oklch"><span>OKLCH</span><strong>{model.estimate.l.toFixed(3)}</strong><strong>{model.estimate.c.toFixed(3)}</strong><strong>{Math.round(model.estimate.h)}°</strong></div></div>
      </article>
      <section className="learning-panel" aria-labelledby="learning-title">
        <div className="section-heading compact-heading"><div><p className="eyebrow">{t('Based on real answers', 'По реальным ответам')}</p><h2 id="learning-title">{t('How well it knows you', 'Насколько модель вас понимает')}</h2></div><span>{t('In order · On device', 'По порядку · На устройстве')}</span></div>
        <div className="metrics-grid">
          <article className="metric-primary"><span>{t('Your answers', 'Ваши ответы')}</span><strong>{model.choices.length}</strong><small>{t('Saved on this device', 'Сохранены на этом устройстве')}</small><div className="choice-track"><i style={{ width: `${Math.min(100, model.choices.length)}%` }} /></div></article>
          <article><span>{t('Prediction accuracy', 'Точность предсказаний')}</span><strong>{accuracy === null ? '—' : `${(accuracy * 100).toFixed(0)}%`}</strong><small>{enough ? t(`${model.metrics?.count} future answers checked`, `Проверено будущих ответов: ${model.metrics?.count}`) : t('Not enough answers yet', 'Пока мало ответов')}</small><div className="metric-track"><i style={{ width: `${accuracy === null ? 0 : accuracy * 100}%` }} /></div></article>
          <article><span>{t('Prediction error', 'Ошибка предсказаний')}</span><strong>{loss === null ? '—' : metric(loss)}</strong><small>{enough ? t(`Lower is better · simple ${metric(model.metrics?.baselineLogLoss)}`, `Чем ниже, тем лучше · простая модель ${metric(model.metrics?.baselineLogLoss)}`) : t('Not enough answers yet', 'Пока мало ответов')}</small><div className="metric-track inverse"><i style={{ width: `${loss === null ? 0 : Math.max(0, Math.min(100, (1 - loss) * 100))}%` }} /></div></article>
          <article><span>{t('Estimate uncertainty', 'Неопределённость')}</span><strong>{Number.isFinite(model.spread) ? model.spread.toFixed(3) : '—'}</strong><small>{t('Lower means more agreement', 'Чем ниже, тем увереннее результат')}</small></article>
          <article><span>{t('Real learning detected', 'Модель действительно учится')}</span><strong>{enough ? (model.metrics?.beatsBaseline ? t('Yes', 'Да') : t('Not yet', 'Пока нет')) : '—'}</strong><small>{t('Compared with simple guesses', 'Сравнение с простыми догадками')}</small></article>
          <article><span>{t('Learning stage', 'Этап обучения')}</span><strong className="text-metric">{stateLabel(model.modelState, language)}</strong><small>{stable ? t('Result is reliable', 'Результат надёжен') : t('Still adapting to you', 'Продолжаем изучать ваш вкус')}</small></article>
        </div>
        <div className="effects-row"><div><span>{t('Time-of-day pattern', 'Влияние времени суток')}</span><strong>{model.choices.length < 100 ? t('Not enough answers yet', 'Пока мало ответов') : model.contextActive ? t('Your taste changes with time', 'Вкус зависит от времени') : t('No clear effect found', 'Явного влияния нет')}</strong></div><div><span>{t('Preference change', 'Изменение вкуса')}</span><strong>{model.choices.length < 100 ? t('Not enough answers yet', 'Пока мало ответов') : model.driftActive ? t('Gradual change detected', 'Обнаружено постепенное изменение') : t('Preferences look stable', 'Предпочтения стабильны')}</strong></div><div><span>{t('Repeat consistency', 'Постоянство ответов')}</span><strong>{model.readiness.controlConsistency === null ? t('Not enough answers yet', 'Пока мало ответов') : `${(model.readiness.controlConsistency * 100).toFixed(0)}% · ${model.readiness.controlCount} ${t('checks', 'проверок')}`}</strong></div></div>
      </section>
    </section>
    <TastePortrait choices={model.choices} language={language} accent={estimateHex} />
    <section className="insights-grid"><HistoryGrid snapshots={model.snapshots} language={language} /><EvolutionChart snapshots={model.snapshots} language={language} /></section>
    <section className="data-panel">
      <div><p className="eyebrow">{t('Local archive', 'Локальный архив')}</p><h2>{t('Your data stays yours.', 'Ваши данные принадлежат вам.')}</h2><p>{t('Answers, daily colors, and the personal model stay in this browser.', 'Ответы, ежедневные цвета и персональная модель остаются в этом браузере.')}</p>
        <label className="sharing-control"><input type="checkbox" role="switch" aria-label={t('Help improve the model', 'Помочь улучшить модель')} checked={sharing} onChange={event => onSharingChange(event.target.checked)} /><span className="sharing-switch"><i /></span><span><strong>{t('Help improve the model', 'Помочь улучшить модель')}</strong><small>{t('Voluntarily send anonymous color choices for a future shared model.', 'Добровольно отправлять обезличенные выборы цветов для будущей общей модели.')}</small></span></label>
      </div>
      <div className="data-actions">
        <button onClick={onRecheckDisplay}>{t('Recheck display', 'Проверить экран')}</button>
        <button onClick={() => void model.exportData()}>{t('Export JSON', 'Скачать JSON')}</button>
        <button onClick={() => input.current?.click()}>{t('Import JSON', 'Загрузить JSON')}</button>
        <input ref={input} hidden type="file" accept="application/json" onChange={event => { const file = event.target.files?.[0]; if (file) void model.importData(file) }} />
        <button className="danger" onClick={() => { if (window.confirm(t('Reset all answers, models, and history on this device?', 'Удалить все ответы, модель и историю на этом устройстве?'))) void model.reset() }}>{t('Reset local data', 'Удалить данные')}</button>
      </div>
    </section>
    <p className="display-note">{t('HEX and OKLCH define the digital estimate. Its visible appearance depends on the screen, its color profile, brightness, and ambient light—no website can guarantee an identical physical color on every display.', 'HEX и OKLCH точно задают цифровую оценку. Видимый цвет зависит от экрана, его цветового профиля, яркости и освещения — сайт не может гарантировать одинаковый физический цвет на всех дисплеях.')}</p>
  </main>
}
