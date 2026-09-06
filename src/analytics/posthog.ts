import posthog from 'posthog-js'

export type SupportLocation = 'result_card' | 'notification_250' | 'other'

type DonationEvent =
  | { name: 'support_seen'; properties: { location: SupportLocation; comparisons: number; pathname: string } }
  | { name: 'support_clicked'; properties: { location: SupportLocation; comparisons: number; pathname: string } }
  | { name: 'support_250_shown'; properties: { comparisons: number; pathname: string } }
  | { name: 'result_viewed'; properties: { comparisons: number; pathname: string } }

type FullStatsEvent =
  | { name: 'full_stats_opened'; properties: { comparisons: number; pathname: string } }
  | { name: 'full_stats_support_shown'; properties: { comparisons: number; pathname: string } }
  | { name: 'full_stats_support_clicked'; properties: { option: '100' | 'other'; comparisons: number; pathname: string } }
  | { name: 'full_stats_support_dismissed'; properties: { reason: 'skip' | 'escape' | 'backdrop'; comparisons: number; pathname: string } }

const stripQuery = (value: unknown) => {
  if (typeof value !== 'string') return value
  try {
    const url = new URL(value, window.location.origin)
    return `${url.origin}${url.pathname}`
  } catch {
    return value
  }
}

let lastPagePath: string | null = null

export const initPostHog = () => {
  const key = import.meta.env.VITE_POSTHOG_PROJECT_TOKEN
  const host = import.meta.env.VITE_POSTHOG_HOST
  if (!key || !host || posthog.__loaded) return

  posthog.init(key, {
    api_host: host,
    defaults: '2026-05-30',
    autocapture: false,
    capture_pageview: false,
    disable_session_recording: true,
    person_profiles: 'identified_only',
    sanitize_properties: properties => {
      const safe = { ...properties }
      if ('$current_url' in safe) safe.$current_url = stripQuery(safe.$current_url)
      if ('$initial_current_url' in safe) safe.$initial_current_url = stripQuery(safe.$initial_current_url)
      return safe
    },
  })
}

export const trackPageView = () => {
  if (!posthog.__loaded) return
  if (lastPagePath === window.location.pathname) return
  lastPagePath = window.location.pathname
  posthog.capture('$pageview', {
    $current_url: `${window.location.origin}${window.location.pathname}`,
    pathname: window.location.pathname,
  })
}

export const trackDonationEvent = ({ name, properties }: DonationEvent) => {
  if (!posthog.__loaded) return
  posthog.capture(name, properties, name === 'support_clicked' ? { send_instantly: true } : undefined)
}

export const trackFullStatsEvent = ({ name, properties }: FullStatsEvent) => {
  if (!posthog.__loaded) return
  posthog.capture(name, properties, name === 'full_stats_support_clicked' ? { send_instantly: true } : undefined)
}
