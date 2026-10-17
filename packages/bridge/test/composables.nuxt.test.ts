// @vitest-environment happy-dom

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { navigateTo, useCookie } from '../src/runtime'

describe('useCookie', () => {
  beforeAll(() => {
    process.client = true
  })

  afterAll(() => {
    process.client = false
  })

  it('should set cookie value when called on client', () => {
    useCookie('cookie-watch-false', { default: () => 'foo', watch: false })
    expect(document.cookie).toContain('cookie-watch-false=foo')

    useCookie('cookie-watch-true', { default: () => 'foo', watch: true })
    expect(document.cookie).toContain('cookie-watch-true=foo')

    useCookie('cookie-readonly', { default: () => 'foo', readonly: true })
    expect(document.cookie).toContain('cookie-readonly=foo')
  })
})

describe('navigateTo', () => {
  beforeAll(() => {
    process.client = true
  })

  afterAll(() => {
    process.client = false
  })

  it('should disallow navigation to external URLs by default', () => {
    expect(() => navigateTo('https://test.com')).toThrow('Navigating to external URL is not allowed by default.')
    expect(() => navigateTo('/\t/test.com')).toThrow('Navigating to external URL is not allowed by default.')
    expect(() => navigateTo('/\n\\test.com')).toThrow('Navigating to external URL is not allowed by default.')
  })

  it('should disallow navigation to data/script URLs', () => {
    const urls = [
      ['javascript:alert("hi")', 'javascript'],
      ['data:alert("hi")', 'data'],
      ['\0data:alert("hi")', 'data']
    ]
    for (const [url, protocol] of urls) {
      expect(() => navigateTo(url, { external: true })).toThrow(`Cannot navigate to a URL with '${protocol}:' protocol.`)
    }
  })

  it('should disallow opening data/script URLs via the `open` option', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    try {
      const urls = [
        ['javascript:alert("hi")', 'javascript'],
        ['data:alert("hi")', 'data'],
        ['vbscript:alert("hi")', 'vbscript'],
        ['\0javascript:alert("hi")', 'javascript']
      ]
      for (const [url, protocol] of urls) {
        expect(() => navigateTo(url, { open: { target: '_blank' } })).toThrow(`Cannot navigate to a URL with '${protocol}:' protocol.`)
      }
      expect(open).not.toHaveBeenCalled()
    } finally {
      open.mockRestore()
    }
  })

  it('should still allow opening safe URLs via the `open` option', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    try {
      expect(() => navigateTo('https://example.com', { open: { target: '_blank' } })).not.toThrow()
      expect(open).toHaveBeenCalledWith('https://example.com', '_blank', '')
    } finally {
      open.mockRestore()
    }
  })
})
