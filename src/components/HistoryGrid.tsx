import { useMemo, useState } from 'react'
import type { DailySnapshot } from '../app/types'

const dayKey = (date: Date) => date.toLocaleDateString('en-CA')

export function HistoryGrid({ snapshots }: { snapshots: DailySnapshot[] }) {
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
    <div className="section-heading compact-heading"><div><p className="eyebrow">Personal color diary</p><h2 id="history-title">Color history</h2></div><span>Past 26 weeks</span></div>
    <div className="history-scroll"><div className="history-grid" aria-label="Daily color estimate history">
      {days.map(date => {
        const snapshot = byDate.get(date)
        return snapshot ? <button className={selected?.date === date ? 'is-active' : ''} key={date} aria-pressed={selected?.date === date} aria-label={`Estimated color for ${date}: ${snapshot.hex}`} style={{ backgroundColor: snapshot.hex }} onClick={() => setSelected(snapshot)} />
          : <span key={date} title={`${date}: no data`} />
      })}
    </div></div>
    <div className="history-detail" aria-live="polite">
      {selected ? <><span className="detail-chip" style={{ background: selected.hex }} /><strong>{selected.date}</strong><span>{selected.hex}</span><span>{selected.state}</span><span>{selected.totalChoices} choices</span><span>{selected.validation ? `${(selected.validation.accuracy * 100).toFixed(0)}% held-out accuracy` : 'Validation unavailable'}</span></>
        : <span>{snapshots.length ? 'Select a recorded day to inspect its evidence.' : 'Your first daily estimate will appear here automatically.'}</span>}
    </div>
  </section>
}
