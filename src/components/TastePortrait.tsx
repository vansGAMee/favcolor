import { useMemo, type CSSProperties } from 'react'
import type { ChoiceEvent } from '../app/types'
import { translate, type Language } from '../app/i18n'
import { buildTasteProfile, type TasteAxisKey } from '../analytics/tasteProfile'

const axisKeys: TasteAxisKey[] = ['lightness', 'chroma', 'warmth']

export function TastePortrait({ choices, language, accent }: { choices: ChoiceEvent[]; language: Language; accent: string }) {
  const t = (english: string, russian: string) => translate(language, english, russian)
  const profile = useMemo(() => buildTasteProfile(choices), [choices])
  const labels: Record<TasteAxisKey, { title: string; low: string; high: string }> = {
    lightness: { title: t('Brightness', 'Яркость'), low: t('Darker', 'Темнее'), high: t('Lighter', 'Светлее') },
    chroma: { title: t('Intensity', 'Насыщенность'), low: t('Softer', 'Спокойнее'), high: t('Vivid', 'Ярче') },
    warmth: { title: t('Temperature', 'Температура'), low: t('Cooler', 'Холоднее'), high: t('Warmer', 'Теплее') },
  }
  const shift = profile.stability.shift
  const stabilityLabel = shift === null ? t('Still gathering', 'Собираем данные') : shift <= 12 ? t('Very steady', 'Очень стабильно') : shift <= 30 ? t('Mostly stable', 'В основном стабильно') : t('Taste is evolving', 'Вкус меняется')

  return <section className="taste-panel" aria-labelledby="taste-title" style={{ '--taste-accent': accent } as CSSProperties}>
    <div className="taste-heading">
      <div><p className="eyebrow">{t('Your choices, decoded', 'Ваши выборы в деталях')}</p><h2 id="taste-title">{t('Taste profile', 'Портрет вкуса')}</h2><p>{t('Each axis uses the strongest clear contrast in the pairs you actually saw.', 'Каждая шкала учитывает главный заметный контраст в показанных вам парах.')}</p></div>
      <div className="stability-readout"><span>{t('Profile movement', 'Изменение профиля')}</span><strong>{shift === null ? '—' : `${shift} ${t('pp', 'п.п.')}`}</strong><small>{stabilityLabel}</small></div>
    </div>
    <div className="taste-axes">
      {axisKeys.map(key => {
        const axis = profile.axes[key]
        const score = axis.score
        const position = score === null ? 50 : (score + 1) * 50
        const path = axis.trend.map((point, index) => {
          const x = axis.trend.length === 1 ? 120 : index / (axis.trend.length - 1) * 240
          const y = 27 - point.score * 19
          return `${index ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`
        }).join(' ')
        const chartLabel = score === null
          ? t(`${labels[key].title}: not enough clear contrasts`, `${labels[key].title}: пока мало заметных сравнений`)
          : t(`${labels[key].title}: ${Math.round(position)} percent toward ${labels[key].high}`, `${labels[key].title}: ${Math.round(position)}% в сторону «${labels[key].high}»`)
        return <article className="taste-axis" key={key}>
          <div className="axis-topline"><strong>{labels[key].title}</strong><span>{axis.sampleCount} {t('clear contrasts', 'заметных сравнений')}</span></div>
          <div className={`preference-scale${score === null ? ' is-empty' : ''}`} role="img" aria-label={chartLabel}>
            <span className="scale-center" />
            {score !== null && <><span className="scale-fill" style={{ left: `${Math.min(50, position)}%`, width: `${Math.abs(position - 50)}%` }} /><span className="scale-marker" style={{ left: `${position}%` }} /></>}
          </div>
          <div className="scale-labels"><span>{labels[key].low}</span><span>{labels[key].high}</span></div>
          <div className="taste-trend">
            {axis.trend.length ? <svg viewBox="0 0 240 54" preserveAspectRatio="none" role="img" aria-label={t(`${labels[key].title} preference across your choices`, `Изменение предпочтения «${labels[key].title}» по вашим ответам`)}>
              <line x1="0" y1="27" x2="240" y2="27" />
              <path d={path} pathLength={1} />
              <circle cx={axis.trend.length === 1 ? 120 : 240} cy={27 - (axis.trend.at(-1)?.score ?? 0) * 19} r="3.5" />
            </svg> : <span>{t('This graph appears after a clear contrast.', 'График появится после заметного сравнения.')}</span>}
          </div>
        </article>
      })}
    </div>
    <p className="taste-note">{t('Movement compares your earlier and recent answers. It describes your choices—it does not change the neural model.', 'Изменение сравнивает ранние и недавние ответы. Эта статистика описывает выборы и не меняет нейросеть.')}</p>
  </section>
}
