import { it, describe, beforeEach, beforeAll, afterAll, expect, vi } from 'vitest'
import { effectScope, nextTick, ref } from 'vue'
import type { NuxtAppCompat } from '@nuxt/bridge-schema'
import { useLazyAsyncData, setNuxtAppInstance } from '../src/runtime'

const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0))

function createMockNuxtApp (): NuxtAppCompat {
  return {
    _asyncData: {},
    _asyncDataPromises: {},
    payload: {
      data: {},
      _errors: {},
      serverRendered: false
    },
    static: {
      data: {}
    },
    isHydrating: false,
    hook: vi.fn(() => vi.fn()),
    callHook: vi.fn()
  } as unknown as NuxtAppCompat
}

describe('useLazyAsyncData', () => {
  beforeAll(() => {
    process.client = true
  })

  afterAll(() => {
    process.client = false
    setNuxtAppInstance(null)
  })

  beforeEach(() => {
    setNuxtAppInstance(createMockNuxtApp())
  })

  it('should use default value with lazy', async () => {
    vi.useFakeTimers()

    const asyncData = useLazyAsyncData(
      'lazy-default',
      () => new Promise(resolve => setTimeout(() => resolve('test'), 10)),
      { default: () => 'default' }
    )

    expect(asyncData.pending.value).toBe(true)
    expect(asyncData.data.value).toBe('default')

    vi.advanceTimersByTime(10)
    await vi.runAllTimersAsync()

    expect(asyncData.data.value).toBe('test')
    expect(asyncData.pending.value).toBe(false)

    vi.useRealTimers()
  })

  it('should return pending true initially', async () => {
    const asyncData = useLazyAsyncData(
      'lazy-pending',
      () => Promise.resolve('result')
    )

    expect(asyncData.pending.value).toBe(true)
    expect(asyncData.status.value).toBe('pending')

    await flushPromises()

    expect(asyncData.pending.value).toBe(false)
    expect(asyncData.status.value).toBe('success')
  })

  it('should handle errors', async () => {
    const asyncData = useLazyAsyncData(
      'lazy-error',
      () => Promise.reject(new Error('test error')),
      { default: () => 'fallback' }
    )

    await flushPromises()

    expect(asyncData.status.value).toBe('error')
    expect(asyncData.error.value).toBeTruthy()
    expect(asyncData.data.value).toBe('fallback')
  })

  it('should support transform option', async () => {
    const asyncData = useLazyAsyncData(
      'lazy-transform',
      () => Promise.resolve({ value: 'original' }),
      { transform: result => result.value.toUpperCase() }
    )

    await flushPromises()

    expect(asyncData.data.value).toBe('ORIGINAL')
  })

  it('should support pick option', async () => {
    const asyncData = useLazyAsyncData(
      'lazy-pick',
      () => Promise.resolve({ foo: 'foo', bar: 'bar', baz: 'baz' }),
      { pick: ['foo', 'bar'] }
    )

    await flushPromises()

    expect(asyncData.data.value).toEqual({ foo: 'foo', bar: 'bar' })
  })

  it('should support refresh', async () => {
    let counter = 0
    const asyncData = useLazyAsyncData(
      'lazy-refresh',
      () => Promise.resolve(++counter)
    )

    await flushPromises()
    expect(asyncData.data.value).toBe(1)

    await asyncData.refresh()
    expect(asyncData.data.value).toBe(2)
  })

  it('should support immediate: false', async () => {
    const handler = vi.fn(() => Promise.resolve('result'))
    const asyncData = useLazyAsyncData(
      'lazy-immediate-false',
      handler,
      { immediate: false }
    )

    expect(handler).not.toHaveBeenCalled()
    expect(asyncData.data.value).toBe(undefined)
    expect(asyncData.pending.value).toBe(true)

    await asyncData.execute()

    expect(handler).toHaveBeenCalled()
    expect(asyncData.data.value).toBe('result')
  })

  it('should automatically re-run when watched ref changes', async () => {
    const query = ref('')
    const handler = vi.fn((q: string) => Promise.resolve(`result: ${q}`))

    const asyncData = useLazyAsyncData(
      'lazy-watch',
      () => handler(query.value),
      { watch: [query] }
    )

    await flushPromises()
    expect(handler).toHaveBeenCalledTimes(1)
    expect(asyncData.data.value).toBe('result: ')

    query.value = 'test'
    await nextTick()
    await flushPromises()

    expect(handler).toHaveBeenCalledTimes(2)
    expect(asyncData.data.value).toBe('result: test')

    query.value = 'updated'
    await nextTick()
    await flushPromises()

    expect(handler).toHaveBeenCalledTimes(3)
    expect(asyncData.data.value).toBe('result: updated')
  })

  it('should stop watching after scope is disposed', async () => {
    const query = ref('')
    const handler = vi.fn((q: string) => Promise.resolve(`result: ${q}`))

    const scope = effectScope()
    scope.run(() =>
      useLazyAsyncData(
        'lazy-watch-dispose',
        () => handler(query.value),
        { watch: [query] }
      )
    )!

    await flushPromises()
    expect(handler).toHaveBeenCalledTimes(1)

    scope.stop()

    query.value = 'after-dispose'
    await nextTick()
    await flushPromises()

    expect(handler).toHaveBeenCalledTimes(1)
  })
})
