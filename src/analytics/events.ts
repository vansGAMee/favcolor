import { track } from '@vercel/analytics/react'

export const trackEvent = (name: 'result_available_view' | 'result_available_open' | 'tea_inline_click' | 'tea_prompt_view' | 'tea_prompt_click') => track(name)
