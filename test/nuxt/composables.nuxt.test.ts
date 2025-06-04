import { describe, it, expect } from 'vitest'
import { useCookie } from '#app'

describe('useCookie', () => {
  it('should set cookie value when called on client', () => {
    useCookie('cookie-watch-false', { default: () => 'foo', watch: false })
    expect(document.cookie).toContain('cookie-watch-false=foo')

    useCookie('cookie-watch-true', { default: () => 'foo', watch: true })
    expect(document.cookie).toContain('cookie-watch-true=foo')

    useCookie('cookie-readonly', { default: () => 'foo', readonly: true })
    expect(document.cookie).toContain('cookie-readonly=foo')
  })
})
