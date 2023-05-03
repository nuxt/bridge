import type { ServerResponse, IncomingMessage as HttpIncomingMessage } from 'node:http'
import type { ComponentOptions } from 'vue'
import type { Route } from 'vue-router'
import type { NuxtAppCompat } from './app'

export interface IncomingMessage extends HttpIncomingMessage {
  originalUrl?: HttpIncomingMessage['url'] | undefined
}

export interface NuxtRuntimeConfig {
  [key: string]: any
  /**
   * This is used internally by Nuxt for dynamic configuration and should not be used.
   *
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
    setTransitions?: (transitions: Transition | Transition[]) => void
  }
  head?: any
  router: import('vue-router').default
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
