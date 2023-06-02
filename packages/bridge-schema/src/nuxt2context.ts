import type { ServerResponse, IncomingMessage as HttpIncomingMessage } from 'node:http'
import type { ComponentOptions, VueConstructor } from 'vue'
import type { Route } from 'vue-router'
import type { Hookable } from 'hookable'

export interface VueAppCompat {
  component: VueConstructor['component']
  config: {
    globalProperties: any
    [key: string]: any
  }
  directive: VueConstructor['directive']
  mixin: VueConstructor['mixin']
  mount: () => void
  provide: (name: string, value: any) => void
  unmount: () => void
  use: VueConstructor['use']
  version: string
}

export interface RuntimeNuxtHooks {
  'app:error': (err: any) => void | Promise<void>
  'app:error:cleared': (options: { redirect?: string }) => void | Promise<void>
  'app:mounted': (app: VueAppCompat) => void | Promise<void>
  'meta:register': (metaRenderers: any[]) => void | Promise<void>
  'vue:setup': () => void
}

export interface NuxtAppCompat {
  // eslint-disable-next-line no-use-before-define
  nuxt2Context: Nuxt2Context
  vue2App: ComponentOptions<Vue>

  vueApp: VueAppCompat

  globalName: string

  hooks: Hookable<RuntimeNuxtHooks>
  hook: NuxtAppCompat['hooks']['hook']
  callHook: NuxtAppCompat['hooks']['callHook']

  [key: string]: any

  ssrContext?: Record<string, any>
  payload: {
    [key: string]: any
  }

  provide: (name: string, value: any) => void
}

export interface IncomingMessage extends HttpIncomingMessage {
  originalUrl?: HttpIncomingMessage['url'] | undefined
}

export interface NuxtRuntimeConfig {
  [key: string]: any
  /**
   * This is used internally by Nuxt for dynamic configuration and should not be used.
   * @internal
   */
  _app?: never
}

export interface NuxtAppOptions extends ComponentOptions<Vue> {
  nuxt: {
    dateErr: number | null
    err: any
    error: any
    defaultTransition?: any
    transitions?: any[]
    setTransitions?: (transitions: any | any[]) => void
  }
  head?: any
  router: import('vue-router').default
  // eslint-disable-next-line no-use-before-define
  context: Nuxt2Context
  $_nuxtApp: NuxtAppCompat
}

type NuxtState = Record<string, any>

export interface NuxtError {
  message?: string
  path?: string
  statusCode?: number
}

export interface Nuxt2Context {
  $config: NuxtRuntimeConfig
  app: NuxtAppOptions
  base: string
  isDev: boolean
  isHMR: boolean
  route: Route
  from: Route
  store: any
  env: Record<string, any>
  params: Route['params']
  payload: any
  query: Route['query']
  next?: (err?: any) => void
  req: IncomingMessage
  res: ServerResponse
  redirect(status: number, path: string, query?: Route['query']): void
  redirect(path: string, query?: Route['query']): void
  redirect(location: Location): void
  redirect(status: number, location: Location): void
  ssrContext?: {
    req: Nuxt2Context['req']
    res: Nuxt2Context['res']
    url: string
    target: 'server' | 'static'
    spa?: boolean
    modern: boolean
    runtimeConfig: {
      public: NuxtRuntimeConfig
      private: NuxtRuntimeConfig
    }
    redirected: boolean
    next: (err?: any) => void
    beforeRenderFns: Array<() => any>
    beforeSerializeFns: Array<() => any>
    fetchCounters: Record<string, number>
    nuxt: {
      layout: string
      data: Array<Record<string, any>>
      fetch: Array<Record<string, any>>
      error: any
      state: Array<Record<string, any>>
      serverRendered: boolean
      routePath: string
      config: NuxtRuntimeConfig
    }
  }
  error(params: NuxtError): NuxtError
  nuxtState: NuxtState
}
