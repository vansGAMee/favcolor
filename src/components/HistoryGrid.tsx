import { useEffect, useMemo, useState } from 'react'
import type { DailySnapshot } from '../app/types'
import { stateLabel, translate, type Language } from '../app/i18n'
import { calculateStreak } from '../app/streak'
import { DailyReminderButton } from './DailyReminderButton'

const dayKey = (date: Date) => date.toLocaleDateString('en-CA')

const useHistoryWeeks = () => {
  const [weeks, setWeeks] = useState(() => typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 620px)').matches ? 13 : 26)
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const query = window.matchMedia('(max-width: 620px)')
    const update = () => setWeeks(query.matches ? 13 : 26)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return weeks
}

const russianDays = (count: number) => count % 10 === 1 && count % 100 !== 11 ? 'день' : count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14) ? 'дня' : 'дней'

export function HistoryGrid({ snapshots, language }: { snapshots: DailySnapshot[]; language: Language }) {
  const t = (english: string, russian: string) => translate(language, english, russian)
  const [selected, setSelected] = useState<DailySnapshot | null>(null)
  const weeks = useHistoryWeeks()
  const streak = useMemo(() => calculateStreak(snapshots.map(snapshot => snapshot.date)), [snapshots])
  const days = useMemo(() => {
    const result: string[] = []
    const today = new Date()
    for (let i = weeks * 7 - 1; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(today.getDate() - i)
      result.push(dayKey(date))
    }
    return result
  }, [weeks])
  const byDate = new Map(snapshots.map(snapshot => [snapshot.date, snapshot]))
  return <section className="history-panel" aria-labelledby="history-title">
    <div className="section-heading compact-heading"><div><p className="eyebrow">{t('Your color diary', 'Ваш дневник цвета')}</p><h2 id="history-title">{t('Color history', 'История цвета')}</h2></div><span>{t(`Past ${weeks} weeks`, `Последние ${weeks} недель`)}</span></div>
    <div className="history-intro">
      <div className="streak-summary"><strong>{language === 'ru' ? `🔥 ${streak.current} ${russianDays(streak.current)} подряд` : `🔥 ${streak.current} ${streak.current === 1 ? 'day' : 'days'} in a row`}</strong><span>{language === 'ru' ? `Лучший результат: ${streak.longest} ${russianDays(streak.longest)}` : `Best: ${streak.longest} ${streak.longest === 1 ? 'day' : 'days'}`}</span></div>
      {streak.activeFromYesterday && <p className="today-note">{t("Today's color has not been saved yet.", 'Сегодняшний цвет ещё не сохранён.')}</p>}
      <p>{t('Your current color is saved each day. Over time, this will show how your taste changes.', 'Каждый день сохраняется ваш текущий цвет. Со временем здесь будет видно, как меняется ваш вкус.')}</p>
      <DailyReminderButton language={language} />
    </div>
    <div className="history-scroll"><div className="history-grid" aria-label={t('Daily color estimate history', 'История ежедневных цветов')}>
      {days.map(date => {
        const snapshot = byDate.get(date)
        return snapshot ? <button className={selected?.date === date ? 'is-active' : ''} key={date} aria-pressed={selected?.date === date} aria-label={`${t('Estimated color for', 'Цвет за')} ${date}: ${snapshot.hex}`} style={{ backgroundColor: snapshot.hex }} onClick={() => setSelected(snapshot)} />
          : <span key={date} title={`${date}: ${t('no data', 'нет данных')}`} />
      })}
    </div></div>
    <div className="history-legend"><span><i className="is-filled" />{t('Filled — color saved', 'Заполнено — цвет сохранён')}</span><span><i />{t('Empty — no data', 'Пусто — данных нет')}</span></div>
    <div className="history-detail" aria-live="polite">
      {selected ? <><span className="detail-chip" style={{ background: selected.hex }} /><strong>{selected.date}</strong><span>{selected.hex}</span><span>{stateLabel(selected.state, language)}</span><span>{selected.totalChoices} {t('answers', 'ответов')}</span><span>{selected.validation ? `${(selected.validation.accuracy * 100).toFixed(0)}% ${t('prediction accuracy', 'точность')}` : t('Accuracy unavailable', 'Точность пока недоступна')}</span></>
        : <span>{snapshots.length ? t('Select a day to see its details.', 'Выберите день, чтобы увидеть подробности.') : t('Your first daily color will appear here automatically.', 'Ваш первый ежедневный цвет появится здесь автоматически.')}</span>}
    </div>
  </section>
}
