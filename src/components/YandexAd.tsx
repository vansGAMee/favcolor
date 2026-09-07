import { useEffect, useRef, useState } from 'react'
import { translate, type Language } from '../app/i18n'

const BLOCK_ID = 'R-A-19998600-1'
const CONTAINER_ID = `yandex_rtb_${BLOCK_ID}`
const LOADER_ID = 'yandex-rtb-loader'

type YandexWindow = Window & {
  yaContextCb?: Array<() => void>
  Ya?: { Context?: { AdvManager?: { render: (options: { blockId: string; renderTo: string }) => unknown } } }
}

export function YandexAd({ language }: { language: Language }) {
  const host = useRef<HTMLElement>(null)
  const slot = useRef<HTMLDivElement>(null)
  const requested = useRef(false)
  const [nearViewport, setNearViewport] = useState(false)
  const [hasCreative, setHasCreative] = useState(false)
  const t = (english: string, russian: string) => translate(language, english, russian)

  useEffect(() => {
    if (!host.current) return
    if (typeof IntersectionObserver === 'undefined') {
      setNearViewport(true)
      return
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      setNearViewport(true)
      observer.disconnect()
    }, { rootMargin: '320px 0px' })
    observer.observe(host.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!nearViewport || requested.current || !slot.current) return
    requested.current = true
    const observer = new MutationObserver(() => {
      if (slot.current?.childElementCount) setHasCreative(true)
    })
    observer.observe(slot.current, { childList: true, subtree: true })

    const yandexWindow = window as YandexWindow
    yandexWindow.yaContextCb = yandexWindow.yaContextCb ?? []
    yandexWindow.yaContextCb.push(() => {
      yandexWindow.Ya?.Context?.AdvManager?.render({ blockId: BLOCK_ID, renderTo: CONTAINER_ID })
    })

    if (!document.getElementById(LOADER_ID)) {
      const script = document.createElement('script')
      script.id = LOADER_ID
      script.src = 'https://yandex.ru/ads/system/context.js'
      script.async = true
      document.head.appendChild(script)
    }
    return () => observer.disconnect()
  }, [nearViewport])

  return <aside ref={host} className={`report-ad${hasCreative ? ' is-filled' : ''}`} aria-hidden={!hasCreative} aria-label={t('Advertisement', 'Реклама')}>
    <p>{t('Advertising helps keep the full report free.', 'Реклама помогает оставлять полный разбор бесплатным.')}</p>
    <div ref={slot} id={CONTAINER_ID} />
  </aside>
}
