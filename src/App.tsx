import { useEffect, useState } from 'react'
import { useColorModel } from './app/useColorModel'
import { translate, type Language } from './app/i18n'
import { Discover } from './components/Discover'
import { You } from './components/You'
import { TrainingPrompt } from './components/TrainingPrompt'
import { DisplayCheck, DISPLAY_CHECK_KEY } from './components/DisplayCheck'
import { setTrainingSharing, trainingSharingEnabled } from './data/trainingCollection'
import './styles.css'

export function App() {
  const [tab, setTab] = useState<'discover' | 'you'>('discover')
  const [sharingEnabled, setSharingEnabled] = useState(trainingSharingEnabled)
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('favcolor-language')
    if (saved === 'en' || saved === 'ru') return saved
    return navigator.language.toLowerCase().startsWith('ru') ? 'ru' : 'en'
  })
  const model = useColorModel()
  const [recheckingDisplay, setRecheckingDisplay] = useState(false)
  const [displayCheckComplete, setDisplayCheckComplete] = useState(() => localStorage.getItem(DISPLAY_CHECK_KEY) === 'complete')
  const t = (english: string, russian: string) => translate(language, english, russian)
  useEffect(() => {
    document.documentElement.lang = language
    localStorage.setItem('favcolor-language', language)
  }, [language])
  const enableSharing = () => { setTrainingSharing(true); setSharingEnabled(true) }
  const updateSharing = (enabled: boolean) => { setTrainingSharing(enabled); setSharingEnabled(enabled) }
  const finishDisplayCheck = () => { localStorage.setItem(DISPLAY_CHECK_KEY, 'complete'); setDisplayCheckComplete(true); setRecheckingDisplay(false) }
  if (!model.hydrated) return <main className="hydration-screen" aria-live="polite">{t('Restoring your color…', 'Восстанавливаем ваш цвет…')}</main>
  const needsDisplayCheck = recheckingDisplay || (model.choices.length === 0 && !displayCheckComplete)
  if (needsDisplayCheck) return <DisplayCheck language={language} onFinish={finishDisplayCheck} />
  return <div className="app-shell">
    <a className="skip-link" href="#main-content">{t('Skip to content', 'Перейти к содержанию')}</a>
    <header className="site-header">
      <button className="wordmark" onClick={() => setTab('discover')} aria-label="Your Color home"><span className="mark" /><span>Favcolor</span><small>Personal lab</small></button>
      <nav className={`tabs ${tab === 'you' ? 'show-you' : 'show-discover'}`} role="tablist" aria-label={t('Main navigation', 'Основная навигация')}>
        <button id="discover-tab" role="tab" aria-controls="discover-panel" aria-selected={tab === 'discover'} tabIndex={tab === 'discover' ? 0 : -1} onKeyDown={event => { if (event.key === 'ArrowRight') { event.preventDefault(); setTab('you'); requestAnimationFrame(() => document.getElementById('you-tab')?.focus()) } }} onClick={() => setTab('discover')}>{t('Discover', 'Выбор')}</button>
        <button id="you-tab" role="tab" aria-controls="you-panel" aria-selected={tab === 'you'} tabIndex={tab === 'you' ? 0 : -1} onKeyDown={event => { if (event.key === 'ArrowLeft') { event.preventDefault(); setTab('discover'); requestAnimationFrame(() => document.getElementById('discover-tab')?.focus()) } }} onClick={() => setTab('you')}>{t('You', 'Мой цвет')}</button>
      </nav>
      <div className="header-tools"><span className="local-badge"><i />{t('Private · On device', 'Приватно · На устройстве')}</span><button className="language-toggle" onClick={() => setLanguage(language === 'en' ? 'ru' : 'en')} aria-label={t('Switch to Russian', 'Переключить на английский')}>{language === 'en' ? 'RU' : 'EN'}</button></div>
    </header>
    {model.error && <div className="error-banner" role="alert">{model.error}</div>}
    <TrainingPrompt choiceCount={model.choices.length} sharingEnabled={sharingEnabled} onHelp={enableSharing} />
    <div className="tab-stage" id="main-content" key={tab}>{tab === 'discover' ? <Discover model={model} language={language} /> : <You model={model} language={language} sharing={sharingEnabled} onSharingChange={updateSharing} onRecheckDisplay={() => setRecheckingDisplay(true)} />}</div>
  </div>
}
