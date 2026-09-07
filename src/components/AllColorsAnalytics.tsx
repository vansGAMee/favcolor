import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import type { ChoiceEvent, OKLCH } from '../app/types'
import { translate, type Language } from '../app/i18n'
import { buildColorAtlas, type ColorShadeStats } from '../analytics/colorAtlas'
import { trackFullStatsEvent } from '../analytics/posthog'
import { YandexAd } from './YandexAd'

const UNLOCKED_KEY = 'favcolor-full-stats-unlocked-v3'
const SUPPORT_SEEN_KEY = 'favcolor-full-stats-support-seen-v3'
const TEA_URL = 'https://pay.cloudtips.ru/p/1c756a9c'
const stored = (key: string) => { try { return localStorage.getItem(key) === 'yes' } catch { return false } }
const remember = (key: string) => { try { localStorage.setItem(key, 'yes') } catch { /* Report remains available. */ } }

export function AllColorsAnalytics({ choices, language, openSignal = 0, primaryColor }: { choices: ChoiceEvent[]; language: Language; openSignal?: number; primaryColor?: OKLCH }) {
  const t = (en: string, ru: string) => translate(language, en, ru)
  const [unlocked, setUnlocked] = useState(() => stored(UNLOCKED_KEY))
  const [supportOpen, setSupportOpen] = useState(false)
  const [supportPending, setSupportPending] = useState(false)
  const region = useRef<HTMLDivElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const previousSignal = useRef(openSignal)
  const atlas = useMemo(() => buildColorAtlas(choices, primaryColor), [choices, primaryColor])
  const properties = useMemo(() => ({ comparisons: atlas.totalComparisons, pathname: typeof window === 'undefined' ? '/' : window.location.pathname }), [atlas.totalComparisons])
  const focusReport = useCallback(() => requestAnimationFrame(() => {
    region.current?.focus()
    region.current?.scrollIntoView?.({ behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
  }), [])
  const unlock = useCallback(() => {
    setUnlocked(true)
    remember(UNLOCKED_KEY)
    trackFullStatsEvent({ name: 'full_stats_opened', properties })
    if (!stored(SUPPORT_SEEN_KEY)) {
      setSupportPending(true)
    }
    focusReport()
  }, [focusReport, properties])
  const closeSupport = useCallback((reason: 'skip' | 'escape' | 'backdrop' | 'donation') => {
    setSupportOpen(false)
    if (reason !== 'donation') trackFullStatsEvent({ name: 'full_stats_support_dismissed', properties: { ...properties, reason } })
    focusReport()
  }, [focusReport, properties])

  useEffect(() => {
    if (openSignal === previousSignal.current) return
    previousSignal.current = openSignal
    unlock()
  }, [openSignal, unlock])
  useEffect(() => {
    if (!unlocked || !supportPending || !region.current) return
    const frame = requestAnimationFrame(() => {
      if (!region.current?.isConnected) return
      remember(SUPPORT_SEEN_KEY)
      setSupportPending(false)
      setSupportOpen(true)
      trackFullStatsEvent({ name: 'full_stats_support_shown', properties })
    })
    return () => cancelAnimationFrame(frame)
  }, [properties, supportPending, unlocked])
  useEffect(() => {
    if (!supportOpen) return
    closeButton.current?.focus()
    const keydown = (event: KeyboardEvent) => { if (event.key === 'Escape') closeSupport('escape') }
    document.addEventListener('keydown', keydown)
    return () => document.removeEventListener('keydown', keydown)
  }, [closeSupport, supportOpen])

  const support = (option: '100' | 'other') => {
    trackFullStatsEvent({ name: 'full_stats_support_clicked', properties: { option, ...properties } })
    closeSupport('donation')
  }
  const backdropClick = (event: MouseEvent<HTMLDivElement>) => { if (event.target === event.currentTarget) closeSupport('backdrop') }
  const Shade = ({ shade }: { shade: ColorShadeStats }) => <article className="shade-card">
    <i className="shade-swatch" style={{ backgroundColor: shade.hex }} aria-hidden="true" />
    <div><strong>{shade.hex.toUpperCase()}</strong><span>{shade.chosen} {t('choices from', 'выборов из')} {shade.exposures} {t('shows', 'показов')}</span></div>
    <b>{Math.round(shade.winRate * 100)}%</b>
  </article>

  return <>
    <section className={`all-colors-panel${unlocked ? ' is-open' : ''}`} aria-labelledby="all-colors-title">
      {!unlocked ? <div className="all-colors-gate">
        <div><p className="eyebrow">{t('Your real choices', 'Ваши реальные выборы')}</p><h2 id="all-colors-title">{t('See every shade you compared', 'Посмотрите все свои оттенки')}</h2><p>{t('Specific screen colors, HEX codes and how often each one won. The report is free and stays on this device.', 'Конкретные цвета с экрана, HEX-коды и частота побед каждого оттенка. Разбор бесплатный и остаётся на этом устройстве.')}</p></div>
        <button type="button" onClick={unlock}>{t('Open the full report for free', 'Открыть полный разбор бесплатно')}</button>
      </div> : <div ref={region} tabIndex={-1} role="region" aria-label={t('Statistics for all colors', 'Статистика по всем цветам')}>
        <div className="all-colors-heading"><div><p className="eyebrow">{t('Your real choices', 'Ваши реальные выборы')}</p><h2 id="all-colors-title">{t('Every shade, not broad categories', 'Все оттенки, а не общие категории')}</h2></div><p>{t('Only colors you actually saw and chose.', 'Только цвета, которые вы видели и выбирали.')}</p></div>
        <div className="atlas-summary">
          <div><strong>{atlas.totalComparisons}</strong><span>{t('comparisons analyzed', 'сравнений изучено')}</span></div>
          <div><strong>{atlas.uniqueRenderedColors}</strong><span>{t('different HEX colors shown', 'разных HEX показано')}</span></div>
          <div><strong>{atlas.distinctChosenColors}</strong><span>{t('shades selected', 'оттенков выбрано')}</span></div>
          <div><strong>{atlas.averageReactionTimeMs === null ? '—' : `${(atlas.averageReactionTimeMs / 1000).toFixed(1)} s`}</strong><span>{t('average decision time', 'среднее время выбора')}</span></div>
        </div>
        <div className="atlas-findings shade-findings">
          <p><span>{t('Most often selected', 'Чаще всего выбирали')}</span><strong className="finding-color"><i style={{ backgroundColor: atlas.chosenShades[0]?.hex }} />{atlas.chosenShades[0]?.hex.toUpperCase() ?? '—'}</strong></p>
          <p><span>{t('Average selected shade', 'Средний выбранный оттенок')}</span><strong className="finding-color"><i style={{ backgroundColor: atlas.averageChosenHex ?? 'transparent' }} />{atlas.averageChosenHex?.toUpperCase() ?? '—'}</strong></p>
          <p><span>{t('Palette coverage', 'Охват палитры')}</span><strong>{atlas.coveredFamilies}/9 {t('regions', 'областей')}</strong></p>
        </div>
        <section className="favorite-collection" aria-labelledby="favorite-collection-title">
          <div className="shade-section-heading"><h3 id="favorite-collection-title">{t('Other favorite colors', 'Другие любимые цвета')}</h3><span>{t('Repeated wins in distinct parts of the palette', 'Повторные победы в разных частях палитры')}</span></div>
          {atlas.favoriteColors.length ? <div className="favorite-mode-grid">{atlas.favoriteColors.map((favorite, index) => <article className="favorite-mode" key={`${favorite.hex}-${index}`}><i style={{ backgroundColor: favorite.hex }} /><div><span>{favorite.kind === 'shade' ? t('Another favorite shade', 'Ещё один любимый оттенок') : t(`Favorite color ${index + 2}`, `Любимый цвет ${index + 2}`)}</span><strong>{favorite.hex.toUpperCase()}</strong><small>OKLCH {favorite.color.l.toFixed(3)} · {favorite.color.c.toFixed(3)} · {Math.round(favorite.color.h)}°</small></div><b>{favorite.chosen}/{favorite.exposures}<small>{t('chosen when shown', 'выбран при показе')}</small></b></article>)}</div> : <p className="collection-empty">{t('The main result is shown above. Other colors will appear here after they win repeatedly in their own part of the palette. A variation of the same hue needs stronger evidence, so one accidental choice does not become a “favorite”.', 'Главный результат показан сверху. Другие цвета появятся здесь, когда начнут повторно побеждать в своей части палитры. Для варианта того же оттенка нужно больше подтверждений, чтобы случайный выбор не стал «любимым».')}</p>}
        </section>
        <section className="shade-section" aria-labelledby="chosen-shades-title">
          <div className="shade-section-heading"><h3 id="chosen-shades-title">{t('Selected shades', 'Выбранные оттенки')}</h3><span>{t('Most frequent first', 'Сначала самые частые')}</span></div>
          {atlas.chosenShades.length ? <div className="shade-grid">{atlas.chosenShades.slice(0, 12).map(shade => <Shade key={shade.hex} shade={shade} />)}</div> : <p className="shade-empty">{t('Make a few comparisons and exact shades will appear here.', 'Сделайте несколько сравнений, и здесь появятся точные оттенки.')}</p>}
        </section>
        {atlas.recentChosenHexes.length > 0 && <section className="recent-shades"><h3>{t('Recent choices', 'Последние выборы')}</h3><div>{atlas.recentChosenHexes.map(hex => <span key={hex} title={hex.toUpperCase()} aria-label={hex.toUpperCase()} style={{ backgroundColor: hex }} />)}</div></section>}
        {atlas.rejectedShades.length > 0 && <section className="shade-section muted-shades">
          <div className="shade-section-heading"><h3>{t('Shades you passed over', 'Оттенки, которые уступали')}</h3><span>{t('Shown but not selected yet', 'Показывались, но пока не выбирались')}</span></div>
          <div className="shade-grid">{atlas.rejectedShades.slice(0, 8).map(shade => <Shade key={shade.hex} shade={shade} />)}</div>
        </section>}
        <YandexAd language={language} />
        <p className="atlas-method">{t('Percentages refer to the exact rendered HEX. Colors that look identical on screen are counted as one shade.', 'Проценты относятся к точному HEX на экране. Одинаково выглядящие цвета считаются одним оттенком.')}</p>
      </div>}
    </section>
    {supportOpen && <div className="full-stats-backdrop" onMouseDown={backdropClick}><section className="full-stats-support" role="dialog" aria-modal="true" aria-labelledby="full-stats-support-title">
      <button ref={closeButton} className="support-close" type="button" aria-label={t('Close', 'Закрыть')} onClick={() => closeSupport('skip')}>×</button>
      <p className="eyebrow">Favcolor</p><h2 id="full-stats-support-title">{t('Your report is ready', 'Статистика готова')}</h2>
      <p>{t('The full report stays free. If it was useful, you can support this independent project. This is entirely optional.', 'Полный анализ остаётся бесплатным. Если результат оказался полезным, можно поддержать независимый проект. Это полностью добровольно.')}</p>
      <div className="support-actions"><a className="support-primary" href={TEA_URL} target="_blank" rel="noreferrer" onClick={() => support('100')}>{t('Support with ₽100', 'Поддержать на 100 ₽')}</a><a href={TEA_URL} target="_blank" rel="noreferrer" onClick={() => support('other')}>{t('Choose another amount', 'Другая сумма')}</a><button type="button" onClick={() => closeSupport('skip')}>{t('Not now', 'Не сейчас')}</button></div>
    </section></div>}
  </>
}
