const PUBLIC_HEX = /^[0-9a-f]{6}$/i

export function parseSharedColor(search: string) {
  const value = new URLSearchParams(search).get('color')
  return value && PUBLIC_HEX.test(value) ? `#${value.toLowerCase()}` : null
}

export function buildColorShareUrl(hex: string, base = window.location.href) {
  const value = hex.startsWith('#') ? hex.slice(1) : hex
  if (!PUBLIC_HEX.test(value)) throw new Error('Invalid color to share')
  const url = new URL(base)
  url.search = ''
  url.hash = ''
  url.searchParams.set('color', value.toLowerCase())
  return url.toString()
}

export async function shareColor(hex: string, title: string, text: string) {
  const url = buildColorShareUrl(hex)
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url })
      return 'shared' as const
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled' as const
    }
  }
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url)
    return 'copied' as const
  }
  const field = document.createElement('textarea')
  field.value = url
  field.style.position = 'fixed'
  field.style.opacity = '0'
  document.body.append(field)
  field.select()
  document.execCommand('copy')
  field.remove()
  return 'copied' as const
}
