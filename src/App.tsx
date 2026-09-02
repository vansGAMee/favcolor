import { useState } from 'react'
import { useColorModel } from './app/useColorModel'
import { Discover } from './components/Discover'
import { You } from './components/You'
import './styles.css'

export function App() {
  const [tab, setTab] = useState<'discover' | 'you'>('discover')
  const model = useColorModel()
  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header className="site-header">
      <button className="wordmark" onClick={() => setTab('discover')} aria-label="Your Color home"><span className="mark" /><span>Favcolor</span><small>Personal lab</small></button>
      <nav role="tablist" aria-label="Main navigation">
        <button id="discover-tab" role="tab" aria-controls="discover-panel" aria-selected={tab === 'discover'} tabIndex={tab === 'discover' ? 0 : -1} onKeyDown={event => { if (event.key === 'ArrowRight') { event.preventDefault(); setTab('you'); requestAnimationFrame(() => document.getElementById('you-tab')?.focus()) } }} onClick={() => setTab('discover')}>Discover</button>
        <button id="you-tab" role="tab" aria-controls="you-panel" aria-selected={tab === 'you'} tabIndex={tab === 'you' ? 0 : -1} onKeyDown={event => { if (event.key === 'ArrowLeft') { event.preventDefault(); setTab('discover'); requestAnimationFrame(() => document.getElementById('discover-tab')?.focus()) } }} onClick={() => setTab('you')}>You</button>
      </nav>
      <span className="local-badge"><i />Private · On device</span>
    </header>
    {model.error && <div className="error-banner" role="alert">{model.error}</div>}
    <div className="tab-stage" id="main-content" key={tab}>{tab === 'discover' ? <Discover model={model} /> : <You model={model} />}</div>
  </div>
}
