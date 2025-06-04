// @vitest-environment happy-dom

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { useCookie } from '../src/runtime'

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
