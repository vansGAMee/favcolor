import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../App'
import { DISPLAY_CHECK_KEY } from '../components/DisplayCheck'
import { buildColorShareUrl, parseSharedColor, shareColor } from '../sharing/colorShare'

describe('public color sharing', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem(DISPLAY_CHECK_KEY, 'complete')
    history.replaceState({}, '', '/')
  })

  afterEach(() => {
    delete (navigator as { share?: unknown }).share
    delete (navigator as { clipboard?: unknown }).clipboard
  })

  it('builds a minimal stable URL and validates shared input', () => {
    expect(buildColorShareUrl('#12AbEf', 'https://favcolor.example/path?private=value#history')).toBe('https://favcolor.example/path?color=12abef')
    expect(parseSharedColor('?color=12AbEf')).toBe('#12abef')
    for (const malformed of ['?color=', '?color=%23000000', '?color=12345', '?color=javascript:alert(1)', '?color=gg0000']) {
      expect(parseSharedColor(malformed)).toBeNull()
    }
  })

  it('opens a valid shared color without exposing the private picker', async () => {
    history.replaceState({}, '', '/?color=123abc')
    render(<App />)
    expect(await screen.findByRole('heading', { name: /shared color|общий цвет/i })).toBeInTheDocument()
    expect(screen.getByText('#123ABC')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /choose|выбрать/i })).not.toBeInTheDocument()
  })

  it('ignores malformed shared colors safely', async () => {
    history.replaceState({}, '', '/?color=not-a-color')
    render(<App />)
    expect(await screen.findAllByRole('button', { name: /choose|выбрать/i })).toHaveLength(2)
    expect(screen.queryByRole('heading', { name: /shared color|общий цвет/i })).not.toBeInTheDocument()
  })

  it('uses native sharing when available', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'share', { configurable: true, value: share })
    await expect(shareColor('#123abc', 'Title', 'Text')).resolves.toBe('shared')
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ url: expect.stringMatching(/\?color=123abc$/) }))
  })

  it('copies the public link when native sharing is unavailable', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    await expect(shareColor('#123abc', 'Title', 'Text')).resolves.toBe('copied')
    expect(writeText).toHaveBeenCalledWith(expect.stringMatching(/\?color=123abc$/))
  })
})
