import { useMemo, useState } from 'react'
import type { DailySnapshot } from '../app/types'
import { stateLabel, translate, type Language } from '../app/i18n'

const dayKey = (date: Date) => date.toLocaleDateString('en-CA')

export function HistoryGrid({ snapshots, language }: { snapshots: DailySnapshot[]; language: Language }) {
  const t = (english: string, russian: string) => translate(language, english, russian)
  const [selected, setSelected] = useState<DailySnapshot | null>(null)
  const days = useMemo(() => {
    const result: string[] = []
    const today = new Date()
    for (let i = 181; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(today.getDate() - i)
      result.push(dayKey(date))
    }
    return result
  }, [])
  const byDate = new Map(snapshots.map(snapshot => [snapshot.date, snapshot]))
  return <section className="history-panel" aria-labelledby="history-title">
    <div className="section-heading compact-heading"><div><p className="eyebrow">{t('Your color diary', 'Ваш дневник цвета')}</p><h2 id="history-title">{t('Color history', 'История цвета')}</h2></div><span>{t('Past 26 weeks', 'Последние 26 недель')}</span></div>
    <div className="history-scroll"><div className="history-grid" aria-label={t('Daily color estimate history', 'История ежедневных цветов')}>
      {days.map(date => {
        const snapshot = byDate.get(date)
        return snapshot ? <button className={selected?.date === date ? 'is-active' : ''} key={date} aria-pressed={selected?.date === date} aria-label={`${t('Estimated color for', 'Цвет за')} ${date}: ${snapshot.hex}`} style={{ backgroundColor: snapshot.hex }} onClick={() => setSelected(snapshot)} />
          : <span key={date} title={`${date}: ${t('no data', 'нет данных')}`} />
      })}
    </div></div>
    <div className="history-detail" aria-live="polite">
      {selected ? <><span className="detail-chip" style={{ background: selected.hex }} /><strong>{selected.date}</strong><span>{selected.hex}</span><span>{stateLabel(selected.state, language)}</span><span>{selected.totalChoices} {t('answers', 'ответов')}</span><span>{selected.validation ? `${(selected.validation.accuracy * 100).toFixed(0)}% ${t('prediction accuracy', 'точность')}` : t('Accuracy unavailable', 'Точность пока недоступна')}</span></>
        : <span>{snapshots.length ? t('Select a day to see its details.', 'Выберите день, чтобы увидеть подробности.') : t('Your first daily color will appear here automatically.', 'Ваш первый ежедневный цвет появится здесь автоматически.')}</span>}
    </div>
  </section>
}
