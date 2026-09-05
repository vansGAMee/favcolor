import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useColorModel } from './app/useColorModel'
import { translate, type Language } from './app/i18n'
import { Discover } from './components/Discover'
import { You } from './components/You'
import { TrainingPrompt } from './components/TrainingPrompt'
import { DisplayCheck, DISPLAY_CHECK_KEY } from './components/DisplayCheck'
import { SharedColor } from './components/SharedColor'
import { setTrainingSharing, trainingSharingEnabled } from './data/trainingCollection'
import { parseSharedColor } from './sharing/colorShare'
import { resultIsAvailable } from './app/resultAvailability'
import { trackEvent } from './analytics/events'
import './styles.css'

const READY_NOTICE_KEY = 'favcolor-ready-result-seen-v1'
const METHOD_PATH = '/how-it-works'
const Method = lazy(() => import('./components/Method').then(module => ({ default: module.Method })))

const tabFromPath = (): 'discover' | 'method' => window.location.pathname.replace(/\/+$/, '') === METHOD_PATH ? 'method' : 'discover'

export function App() {
  const [tab, setTab] = useState<'discover' | 'you' | 'method'>(tabFromPath)
  const [sharingEnabled, setSharingEnabled] = useState(trainingSharingEnabled)
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('favcolor-language')
    if (saved === 'en' || saved === 'ru') return saved
    return navigator.language.toLowerCase().startsWith('ru') ? 'ru' : 'en'
  })
  const model = useColorModel()
  const [recheckingDisplay, setRecheckingDisplay] = useState(false)
  const [displayCheckComplete, setDisplayCheckComplete] = useState(() => localStorage.getItem(DISPLAY_CHECK_KEY) === 'complete')
  const [readyNoticeSeen, setReadyNoticeSeen] = useState(() => localStorage.getItem(READY_NOTICE_KEY) === 'seen')
  const availabilityViewTracked = useRef(false)
  const sharedHex = parseSharedColor(window.location.search)
  const t = (english: string, russian: string) => translate(language, english, russian)
  useEffect(() => {
    document.documentElement.lang = language
    localStorage.setItem('favcolor-language', language)
  }, [language])
  useEffect(() => {
    const syncTabToPath = () => setTab(tabFromPath())
    window.addEventListener('popstate', syncTabToPath)
    return () => window.removeEventListener('popstate', syncTabToPath)
  }, [])
  const selectTab = (nextTab: 'discover' | 'you' | 'method') => {
    setTab(nextTab)
    const nextPath = nextTab === 'method' ? METHOD_PATH : '/'
    if (window.location.pathname !== nextPath) window.history.pushState({}, '', nextPath)
  }
  const enableSharing = () => { setTrainingSharing(true); setSharingEnabled(true) }
  const updateSharing = (enabled: boolean) => { setTrainingSharing(enabled); setSharingEnabled(enabled) }
  const finishDisplayCheck = () => { localStorage.setItem(DISPLAY_CHECK_KEY, 'complete'); setDisplayCheckComplete(true); setRecheckingDisplay(false) }
  const resultAvailable = resultIsAvailable(model.choices.length, model.estimate)
  const unseenResult = resultAvailable && !readyNoticeSeen
  const showAvailableResult = unseenResult && tab === 'discover'
  useEffect(() => {
    if (!model.hydrated) return
    if (model.choices.length === 0) {
      localStorage.removeItem(READY_NOTICE_KEY)
      setReadyNoticeSeen(false)
      availabilityViewTracked.current = false
    }
  }, [model.hydrated, model.choices.length])
  useEffect(() => {
    if (!showAvailableResult || availabilityViewTracked.current) return
    availabilityViewTracked.current = true
    trackEvent('result_available_view')
  }, [showAvailableResult])
  const openResult = () => {
    if (resultAvailable && !readyNoticeSeen) {
      localStorage.setItem(READY_NOTICE_KEY, 'seen')
      setReadyNoticeSeen(true)
      trackEvent('result_available_open')
    }
    selectTab('you')
  }
  if (sharedHex) return <SharedColor hex={sharedHex} language={language} />
  if (!model.hydrated) return <main className="hydration-screen" aria-live="polite">{t('Restoring your color…', 'Восстанавливаем ваш цвет…')}</main>
  const needsDisplayCheck = tab !== 'method' && (recheckingDisplay || (model.choices.length === 0 && !displayCheckComplete))
  if (needsDisplayCheck) return <DisplayCheck language={language} onFinish={finishDisplayCheck} />
  return <div className="app-shell">
    <a className="skip-link" href="#main-content">{t('Skip to content', 'Перейти к содержанию')}</a>
    <header className="site-header">
      <button className="wordmark" onClick={() => selectTab('discover')} aria-label="Your Color home"><span className="mark" /><span>Favcolor</span><small>Personal lab</small></button>
      <nav className={`tabs show-${tab}`} role="tablist" aria-label={t('Main navigation', 'Основная навигация')}>
        <button id="discover-tab" role="tab" aria-controls="discover-panel" aria-selected={tab === 'discover'} tabIndex={tab === 'discover' ? 0 : -1} onKeyDown={event => { if (event.key === 'ArrowRight') { event.preventDefault(); selectTab('you'); requestAnimationFrame(() => document.getElementById('you-tab')?.focus()) } }} onClick={() => selectTab('discover')}>{t('Discover', 'Выбор')}</button>
        <button id="you-tab" className={unseenResult ? 'has-unseen-result' : undefined} role="tab" aria-controls="you-panel" aria-selected={tab === 'you'} tabIndex={tab === 'you' ? 0 : -1} onKeyDown={event => { if (event.key === 'ArrowLeft') { event.preventDefault(); selectTab('discover'); requestAnimationFrame(() => document.getElementById('discover-tab')?.focus()) } else if (event.key === 'ArrowRight') { event.preventDefault(); selectTab('method'); requestAnimationFrame(() => document.getElementById('method-tab')?.focus()) } }} onClick={openResult}>{t('You', 'Мой цвет')}{unseenResult && <i className="result-tab-dot" aria-hidden="true" />}</button>
        <button id="method-tab" role="tab" aria-controls="method-panel" aria-selected={tab === 'method'} tabIndex={tab === 'method' ? 0 : -1} onKeyDown={event => { if (event.key === 'ArrowLeft') { event.preventDefault(); selectTab('you'); requestAnimationFrame(() => document.getElementById('you-tab')?.focus()) } }} onClick={() => selectTab('method')}>{t('How it works', 'Как работает')}</button>
      </nav>
      <div className="header-tools"><span className="local-badge"><i />{t('Private · On device', 'Приватно · На устройстве')}</span><button className="language-toggle" onClick={() => setLanguage(language === 'en' ? 'ru' : 'en')} aria-label={t('Switch to Russian', 'Переключить на английский')}>{language === 'en' ? 'RU' : 'EN'}</button></div>
    </header>
    {model.error && <div className="error-banner" role="alert">{model.error}</div>}
    <TrainingPrompt choiceCount={model.choices.length} sharingEnabled={sharingEnabled} onHelp={enableSharing} />
    <div className="tab-stage" id="main-content" key={tab}>{tab === 'discover' ? <Discover model={model} language={language} showReadyResult={showAvailableResult} onOpenResult={openResult} /> : tab === 'you' ? <You model={model} language={language} sharing={sharingEnabled} onSharingChange={updateSharing} onRecheckDisplay={() => setRecheckingDisplay(true)} /> : <Suspense fallback={<main className="method-page method-loading" id="method-panel" role="tabpanel" aria-labelledby="method-tab"><span>{t('Loading the research…', 'Загружаем исследование…')}</span></main>}><Method language={language} /></Suspense>}</div>
  </div>
}
