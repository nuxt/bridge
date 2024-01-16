/// <reference types="nitropack" />
import type { Nuxt2Config } from '@nuxt/bridge-schema'
import type { NuxtConfig as _NuxtConfig } from '@nuxt/schema'
import type { MetaInfo } from 'vue-meta'

export interface NuxtSSRContext extends SSRContext {
  url: string
  noSSR: boolean
  redirected?: boolean
  event: H3Event
  /** @deprecated use `ssrContext.event` instead */
  req: H3Event['req']
  /** @deprecated use `ssrContext.event` instead */
  res: H3Event['res']
  runtimeConfig: RuntimeConfig
  error?: any
  nuxt?: any
  payload?: any
  renderMeta?: () => Promise<any>
}


export interface BridgeConfig {
  nitro: boolean
  nitroGenerator: boolean
  vite: boolean
  app: boolean | {}
  capi: boolean | {
    legacy?: boolean
  }
  /**
   * @deprecated use `imports.autoImport` instead to disable auto-importing.
   * @see {@link https://nuxt.com/docs/guide/concepts/auto-imports#disabling-auto-imports}
   */
  imports: boolean
  /** @deprecated */
  autoImports?: boolean
  transpile: boolean
  compatibility: boolean
  postcss8: boolean
  resolve: boolean
  typescript: boolean | {
    /**
     * @deprecated it will be removed.
     */
    isTSX?: boolean
  }
  meta: boolean | null
  macros: false | {
    pageMeta: boolean
  }
}

export interface NuxtConfig extends Nuxt2Config, Omit<_NuxtConfig, keyof Nuxt2Config> {
  head?: LegacyNuxtConfig['head'] | MetaInfo | (() => MetaInfo)
}

declare module '@nuxt/bridge-schema' {
  interface Nuxt2Config {
    bridge?: Partial<BridgeConfig> | false
  }
}

declare module 'nitropack' {
  interface NitroRouteConfig {
    ssr?: boolean
  }
  interface NitroRouteOptions {
    ssr?: boolean
  }
}

export declare function defineNuxtConfig (config: NuxtConfig): NuxtConfig
