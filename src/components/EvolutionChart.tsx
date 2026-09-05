import { useMemo } from 'react'
import type { DailySnapshot } from '../app/types'
import { oklchToOklab } from '../color/color'
import { translate, type Language } from '../app/i18n'

export function EvolutionChart({ snapshots, language }: { snapshots: DailySnapshot[]; language: Language }) {
  const t = (english: string, russian: string) => translate(language, english, russian)
  const points = useMemo(() => snapshots.slice(-90).map(snapshot => {
    const lab = oklchToOklab(snapshot.color)
    return { x: 160 + lab.a * 430, y: 140 - lab.b * 330, snapshot }
  }), [snapshots])
  const path = points.map((point, index) => `${index ? 'L' : 'M'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ')

  return <section className="evolution-panel" aria-labelledby="evolution-title">
    <div className="section-heading compact-heading"><div><p className="eyebrow">{t('How your color moves', 'Как меняется ваш цвет')}</p><h2 id="evolution-title">{t('Color evolution', 'Изменение цвета')}</h2></div><span>{points.length ? `${points.length} ${t('recorded days', 'дней')}` : t('Waiting for history', 'Ждём историю')}</span></div>
    <p className="evolution-explainer">{t('Each point continues the diary above: saved daily colors become a path of change.', 'Каждая точка продолжает дневник: сохранённые цвета складываются в путь изменений.')}</p>
    {points.length >= 2 ? <>
      <div className="trajectory-wrap">
        <svg className="trajectory" viewBox="0 0 320 280" role="img" aria-label={`${t('Color movement across', 'Изменение цвета за')} ${points.length} ${t('recorded days', 'дней')}`}>
          <line className="chart-axis" x1="24" y1="140" x2="296" y2="140" />
          <line className="chart-axis" x1="160" y1="24" x2="160" y2="256" />
          <path className="chart-path-shadow" d={path} pathLength={1} />
          <path className="chart-path" d={path} pathLength={1} />
          {points.map((point, index) => <circle key={`${point.snapshot.date}-${index}`} cx={point.x} cy={point.y} r={index === points.length - 1 ? 7 : 4} fill={point.snapshot.hex}><title>{point.snapshot.date} · {point.snapshot.hex}</title></circle>)}
        </svg>
        <span className="axis-label axis-cool">{t('green', 'зелёный')}</span><span className="axis-label axis-warm">{t('red', 'красный')}</span><span className="axis-label axis-vivid">{t('yellow', 'жёлтый')}</span><span className="axis-label axis-deep">{t('blue', 'синий')}</span>
      </div>
      <div className="trajectory-legend"><span><i style={{ background: points[0].snapshot.hex }} />{points[0].snapshot.date}</span><span><i style={{ background: points.at(-1)?.snapshot.hex }} />{points.at(-1)?.snapshot.date}</span></div>
    </> : <div className="chart-empty"><div className="empty-orbit"><i /></div><strong>{t('Your path will appear here.', 'Здесь появится путь вашего цвета.')}</strong><span>{t('Two recorded days are enough to draw it. We never invent past values.', 'Достаточно двух сохранённых дней. Прошлые значения не придумываются.')}</span></div>}
  </section>
}
