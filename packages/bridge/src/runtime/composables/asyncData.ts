import { onBeforeMount, onServerPrefetch, onUnmounted, ref, shallowRef, getCurrentInstance, watch, toRef, unref, getCurrentScope, onScopeDispose } from 'vue'
import type { Ref, WatchSource } from 'vue'
import type { NuxtAppCompat } from '@nuxt/bridge-schema'
import { useNuxtApp } from '../nuxt'
import { createError } from './error'

export type _Transform<Input = any, Output = any> = (input: Input) => Output | Promise<Output>

export type PickFrom<T, K extends Array<string>> = T extends Array<any> ? T : T extends Record<string, any> ? Pick<T, K[number]> : T
export type KeysOf<T> = Array<keyof T extends string ? keyof T : string>
export type KeyOfRes<Transform extends _Transform> = KeysOf<ReturnType<Transform>>

export type MultiWatchSources = (WatchSource<unknown> | object)[]

export type AsyncDataRequestStatus = 'idle' | 'pending' | 'success' | 'error'

export interface AsyncDataOptions<
  ResT,
  DataT = ResT,
  PickKeys extends KeysOf<DataT> = KeysOf<DataT>,
  DefaultT = null,
> {
  /**
   * Whether to fetch on the server side.
   * @default true
   */
  server?: boolean
  /**
   * Whether to resolve the async function after loading the route, instead of blocking client-side navigation
   * @default false
   */
  lazy?: boolean
  /**
   * a factory function to set the default value of the data, before the async function resolves - useful with the `lazy: true` or `immediate: false` options
   */
  default?: () => DefaultT | Ref<DefaultT>
  /**
   * Provide a function which returns cached data.
   * A `null` or `undefined` return value will trigger a fetch.
   * Default is `key => nuxt.isHydrating ? nuxt.payload.data[key] : nuxt.static.data[key]` which only caches data when payloadExtraction is enabled.
   */
  getCachedData?: (key: string, nuxtApp: NuxtAppCompat) => DataT
  /**
   * A function that can be used to alter handler function result after resolving
   */
  transform?: _Transform<ResT, DataT>
  /**
   * Only pick specified keys in this array from the handler function result
   */
  pick?: PickKeys
  /**
   * Watch reactive sources to auto-refresh when changed
   */
  watch?: MultiWatchSources
  /**
   * When set to false, will prevent the request from firing immediately
   * @default true
   */
  immediate?: boolean
  /**
   * Return data in a deep ref object (it is true by default). It can be set to false to return data in a shallow ref object, which can improve performance if your data does not need to be deeply reactive.
   */
  deep?: boolean
  /**
   * Avoid fetching the same key more than once at a time
   * @default 'cancel'
   */
  dedupe?: 'cancel' | 'defer'
}

export interface AsyncDataExecuteOptions {
  _initial?: boolean;
  // TODO: remove boolean option in Nuxt 4
  /**
   * Force a refresh, even if there is already a pending request. Previous requests will
   * not be cancelled, but their result will not affect the data/pending state - and any
   * previously awaited promises will not resolve until this new request resolves.
   *
   * Instead of using `boolean` values, use `cancel` for `true` and `defer` for `false`.
   * Boolean values will be removed in a future release.
   */
  dedupe?: boolean | 'cancel' | 'defer'
}

export interface _AsyncData<DataT, ErrorT> {
  data: Ref<DataT>
  /**
   * @deprecated Use `status` instead. This may be removed in a future major version.
   */
  pending: Ref<boolean>
  refresh: (opts?: AsyncDataExecuteOptions) => Promise<DataT>
  execute: (opts?: AsyncDataExecuteOptions) => Promise<DataT>
  error: Ref<ErrorT | null>
  status: Ref<AsyncDataRequestStatus>
}

export type AsyncData<Data, Error> = _AsyncData<Data, Error> & Promise<_AsyncData<Data, Error>>

// TODO: remove boolean option in Nuxt 4
const isDefer = (dedupe?: boolean | 'cancel' | 'defer') => dedupe === 'defer' || dedupe === false

export function useAsyncData<
  ResT,
  DataE = Error,
  DataT = ResT,
  PickKeys extends KeysOf<DataT> = KeysOf<DataT>,
  DefaultT = null,
> (
  handler: (ctx?: NuxtAppCompat) => Promise<ResT>,
  options?: AsyncDataOptions<ResT, DataT, PickKeys, DefaultT>
): AsyncData<PickFrom<DataT, PickKeys> | DefaultT, DataE | null>
export function useAsyncData<
  ResT,
  DataE = Error,
  DataT = ResT,
  PickKeys extends KeysOf<DataT> = KeysOf<DataT>,
  DefaultT = DataT,
> (
  handler: (ctx?: NuxtAppCompat) => Promise<ResT>,
  options?: AsyncDataOptions<ResT, DataT, PickKeys, DefaultT>
): AsyncData<PickFrom<DataT, PickKeys> | DefaultT, DataE | null>
export function useAsyncData<
  ResT,
  DataE = Error,
  DataT = ResT,
  PickKeys extends KeysOf<DataT> = KeysOf<DataT>,
  DefaultT = null,
> (
  key: string,
  handler: (ctx?: NuxtAppCompat) => Promise<ResT>,
  options?: AsyncDataOptions<ResT, DataT, PickKeys, DefaultT>
): AsyncData<PickFrom<DataT, PickKeys> | DefaultT, DataE | null>
export function useAsyncData<
  ResT,
  DataE = Error,
  DataT = ResT,
  PickKeys extends KeysOf<DataT> = KeysOf<DataT>,
  DefaultT = DataT,
> (
  key: string,
  handler: (ctx?: NuxtAppCompat) => Promise<ResT>,
  options?: AsyncDataOptions<ResT, DataT, PickKeys, DefaultT>
): AsyncData<PickFrom<DataT, PickKeys> | DefaultT, DataE | null>
export function useAsyncData<
  ResT,
  DataE = Error,
  DataT = ResT,
  PickKeys extends KeysOf<DataT> = KeysOf<DataT>,
  DefaultT = null,
> (...args: any[]): AsyncData<PickFrom<DataT, PickKeys>, DataE | null> {
  const autoKey = typeof args[args.length - 1] === 'string' ? args.pop() : undefined
  if (typeof args[0] !== 'string') { args.unshift(autoKey) }

  // eslint-disable-next-line prefer-const
  let [key, handler, options = {}] = args as [string, (ctx?: NuxtAppCompat) => Promise<ResT>, AsyncDataOptions<ResT, DataT, PickKeys, DefaultT>]

  // Validate arguments
  if (typeof key !== 'string') {
    throw new TypeError('asyncData key must be a string')
  }
  if (typeof handler !== 'function') {
    throw new TypeError('asyncData handler must be a function')
  }

  // Setup nuxt instance payload
  const nuxt = useNuxtApp()

  // Used to get default values
  const getDefault = () => null
  const getDefaultCachedData = () => nuxt.isHydrating ? nuxt.payload.data[key] : nuxt.static.data[key]

  // Apply defaults
  options.server = options.server ?? true
  options.default = options.default ?? (getDefault as () => DefaultT)
  options.getCachedData = options.getCachedData ?? getDefaultCachedData

  const hasCachedData = () => options.getCachedData!(key, nuxt) != null

  options.lazy = options.lazy ?? false
  options.immediate = options.immediate ?? true
  options.deep = options.deep ?? false
  options.dedupe = options.dedupe ?? 'cancel'

  if (process.dev && typeof options.dedupe === 'boolean') {
    console.warn('[nuxt] `boolean` values are deprecated for the `dedupe` option of `useAsyncData` and will be removed in the future. Use \'cancel\' or \'defer\' instead.')
  }

  // Create or use a shared asyncData entity
  if (!nuxt._asyncData[key] || !options.immediate) {
    nuxt.payload._errors[key] = nuxt.payload._errors[key] ?? null

    const _ref = options.deep ? ref : shallowRef

    nuxt._asyncData[key] = {
      data: _ref(options.getCachedData!(key, nuxt) ?? options.default!()),
      pending: ref(!hasCachedData()),
      error: toRef(nuxt.payload._errors, key),
      status: ref('idle')
    }
  }

  // TODO: Else, somehow check for conflicting keys with different defaults or fetcher
  const asyncData = { ...nuxt._asyncData[key] } as AsyncData<DataT | DefaultT, DataE>

  asyncData.refresh = asyncData.execute = (opts = {}) => {
    if (nuxt._asyncDataPromises[key]) {
      if (isDefer(opts.dedupe ?? options.dedupe)) {
        // Avoid fetching same key more than once at a time
        return nuxt._asyncDataPromises[key]!
      }
      (nuxt._asyncDataPromises[key] as any).cancelled = true
    }
    // Avoid fetching same key that is already fetched
    if ((opts._initial || (nuxt.isHydrating && opts._initial !== false)) && hasCachedData()) {
      return Promise.resolve(options.getCachedData!(key, nuxt))
    }
    asyncData.pending.value = true
    asyncData.status.value = 'pending'
    // TODO: Cancel previous promise
    const promise = new Promise<ResT>(
      (resolve, reject) => {
        try {
          resolve(handler(nuxt))
        } catch (err) {
          reject(err)
        }
      })
      .then(async (_result) => {
        // If this request is cancelled, resolve to the latest request.
        if ((promise as any).cancelled) { return nuxt._asyncDataPromises[key] }

        let result = _result as unknown as DataT
        if (options.transform) {
          result = await options.transform(_result)
        }
        if (options.pick) {
          result = pick(result as any, options.pick) as DataT
        }

        nuxt.payload.data[key] = result

        asyncData.data.value = result
        asyncData.error.value = null
        asyncData.status.value = 'success'
      })
      .catch((error: any) => {
        // If this request is cancelled, resolve to the latest request.
        if ((promise as any).cancelled) { return nuxt._asyncDataPromises[key] }

        asyncData.error.value = createError(error) as DataE
        asyncData.data.value = unref(options.default!())
        asyncData.status.value = 'error'
      })
      .finally(() => {
        if ((promise as any).cancelled) { return }

        asyncData.pending.value = false

        delete nuxt._asyncDataPromises[key]
      })
    nuxt._asyncDataPromises[key] = promise
    return nuxt._asyncDataPromises[key]!
  }

  const initialFetch = () => asyncData.refresh({ _initial: true })

  const fetchOnServer = options.server !== false && nuxt.payload.serverRendered

  // Server side
  if (process.server && fetchOnServer && options.immediate) {
    const promise = initialFetch()
    onServerPrefetch(() => promise)
  }

  // Client side
  if (process.client) {
    // Setup hook callbacks once per instance
    const instance = getCurrentInstance()
    if (instance && !instance._nuxtOnBeforeMountCbs) {
      const cbs = instance._nuxtOnBeforeMountCbs = []
      if (instance && process.client) {
        onBeforeMount(() => {
          cbs.forEach((cb) => { cb() })
          cbs.splice(0, cbs.length)
        })
        onUnmounted(() => cbs.splice(0, cbs.length))
      }
    }

    if (fetchOnServer && nuxt.isHydrating && (asyncData.error.value || hasCachedData())) {
      // 1. Hydration (server: true): no fetch
      asyncData.pending.value = false
    } else if (instance && ((nuxt.payload.serverRendered && nuxt.isHydrating) || options.lazy) && options.immediate) {
      // 2. Initial load (server: false): fetch on mounted
      // 3. Navigation (lazy: true): fetch on mounted
      instance._nuxtOnBeforeMountCbs.push(initialFetch)
    } else if (options.immediate) {
      // 4. Navigation (lazy: false) - or plugin usage: await fetch
      initialFetch()
    }

    const hasScope = getCurrentScope()
    if (options.watch) {
      const unsub = watch(options.watch, () => asyncData.refresh())
      if (hasScope) {
        onScopeDispose(unsub)
      }
    }
    const off = nuxt.hook('app:data:refresh', (keys) => {
      if (!keys || keys.includes(key)) {
        return asyncData.refresh()
      }
    })
    if (hasScope) {
      onScopeDispose(off)
    }
  }

  // Allow directly awaiting on asyncData
  const asyncDataPromise = Promise.resolve(nuxt._asyncDataPromises[key]).then(() => asyncData) as AsyncData<ResT, DataE>
  Object.assign(asyncDataPromise, asyncData)

  return asyncDataPromise as AsyncData<PickFrom<DataT, PickKeys>, DataE>
}

export function useLazyAsyncData<
  ResT,
  DataE = Error,
  DataT = ResT,
  PickKeys extends KeysOf<DataT> = KeysOf<DataT>,
  DefaultT = null,
> (
  handler: (ctx?: NuxtAppCompat) => Promise<ResT>,
  options?: Omit<AsyncDataOptions<ResT, DataT, PickKeys, DefaultT>, 'lazy'>
): AsyncData<PickFrom<DataT, PickKeys> | DefaultT, DataE | null>
export function useLazyAsyncData<
  ResT,
  DataE = Error,
  DataT = ResT,
  PickKeys extends KeysOf<DataT> = KeysOf<DataT>,
  DefaultT = DataT,
> (
  handler: (ctx?: NuxtAppCompat) => Promise<ResT>,
  options?: Omit<AsyncDataOptions<ResT, DataT, PickKeys, DefaultT>, 'lazy'>
): AsyncData<PickFrom<DataT, PickKeys> | DefaultT, DataE | null>
export function useLazyAsyncData<
  ResT,
  DataE = Error,
  DataT = ResT,
  PickKeys extends KeysOf<DataT> = KeysOf<DataT>,
  DefaultT = null,
> (
  key: string,
  handler: (ctx?: NuxtAppCompat) => Promise<ResT>,
  options?: Omit<AsyncDataOptions<ResT, DataT, PickKeys, DefaultT>, 'lazy'>
): AsyncData<PickFrom<DataT, PickKeys> | DefaultT, DataE | null>
export function useLazyAsyncData<
  ResT,
  DataE = Error,
  DataT = ResT,
  PickKeys extends KeysOf<DataT> = KeysOf<DataT>,
  DefaultT = DataT,
> (
  key: string,
  handler: (ctx?: NuxtAppCompat) => Promise<ResT>,
  options?: Omit<AsyncDataOptions<ResT, DataT, PickKeys, DefaultT>, 'lazy'>
): AsyncData<PickFrom<DataT, PickKeys> | DefaultT, DataE | null>

export function useLazyAsyncData<
  ResT,
  DataE = Error,
  DataT = ResT,
  PickKeys extends KeysOf<DataT> = KeysOf<DataT>,
  DefaultT = null,
> (...args: any[]): AsyncData<PickFrom<DataT, PickKeys> | DefaultT, DataE | null> {
  const autoKey = typeof args[args.length - 1] === 'string' ? args.pop() : undefined
  if (typeof args[0] !== 'string') { args.unshift(autoKey) }
  const [key, handler, options] = args as [string, (ctx?: NuxtAppCompat) => Promise<ResT>, AsyncDataOptions<ResT, DataT, PickKeys, DefaultT>]
  // @ts-expect-error we pass an extra argument to prevent a key being injected
  return useAsyncData(key, handler, { ...options, lazy: true }, null)
}

export function refreshNuxtData (keys?: string | string[]): Promise<void> {
  if (process.server) {
    return Promise.resolve()
  }
  const _keys = keys ? Array.isArray(keys) ? keys : [keys] : undefined
  return useNuxtApp().callHook('app:data:refresh', _keys)
}

function pick (obj: Record<string, any>, keys: string[]) {
  const newObj = {}
  for (const key of keys) {
    newObj[key] = obj[key]
  }
  return newObj
}
