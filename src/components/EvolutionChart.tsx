import { useMemo } from 'react'
import type { DailySnapshot } from '../app/types'
import { oklchToOklab } from '../color/color'

export function EvolutionChart({ snapshots }: { snapshots: DailySnapshot[] }) {
  const points = useMemo(() => snapshots.slice(-90).map(snapshot => {
    const lab = oklchToOklab(snapshot.color)
    return { x: 160 + lab.a * 430, y: 140 - lab.b * 330, snapshot }
  }), [snapshots])
  const path = points.map((point, index) => `${index ? 'L' : 'M'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ')

  return <section className="evolution-panel" aria-labelledby="evolution-title">
    <div className="section-heading compact-heading"><div><p className="eyebrow">OKLab movement</p><h2 id="evolution-title">Preference evolution</h2></div><span>{points.length ? `${points.length} recorded days` : 'Waiting for history'}</span></div>
    {points.length >= 2 ? <>
      <div className="trajectory-wrap">
        <svg className="trajectory" viewBox="0 0 320 280" role="img" aria-label={`Color estimate trajectory across ${points.length} recorded days`}>
          <line className="chart-axis" x1="24" y1="140" x2="296" y2="140" />
          <line className="chart-axis" x1="160" y1="24" x2="160" y2="256" />
          <path className="chart-path-shadow" d={path} pathLength={1} />
          <path className="chart-path" d={path} pathLength={1} />
          {points.map((point, index) => <circle key={`${point.snapshot.date}-${index}`} cx={point.x} cy={point.y} r={index === points.length - 1 ? 7 : 4} fill={point.snapshot.hex}><title>{point.snapshot.date} · {point.snapshot.hex}</title></circle>)}
        </svg>
        <span className="axis-label axis-cool">cool</span><span className="axis-label axis-warm">warm</span><span className="axis-label axis-vivid">yellow</span><span className="axis-label axis-deep">blue</span>
      </div>
      <div className="trajectory-legend"><span><i style={{ background: points[0].snapshot.hex }} />{points[0].snapshot.date}</span><span><i style={{ background: points.at(-1)?.snapshot.hex }} />{points.at(-1)?.snapshot.date}</span></div>
    </> : <div className="chart-empty"><div className="empty-orbit"><i /></div><strong>Your path will appear here.</strong><span>Two recorded days are enough to draw a real trajectory—nothing is estimated retroactively.</span></div>}
  </section>
}
