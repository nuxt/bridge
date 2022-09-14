/// <reference types="nitropack" />
import type { NuxtConfig as _NuxtConfig } from '@nuxt/schema'
import type { MetaInfo } from 'vue-meta'

export interface BridgeConfig {
  nitro: boolean
  nitroGenerator: boolean
  vite: boolean
  app: boolean | {}
  capi: boolean | {
    legacy?: boolean
  }
  imports: boolean
  /** @deprecated */
  autoImports?: boolean
  transpile: boolean
  compatibility: boolean
  postcss8: boolean
  resolve: boolean
  typescript: boolean
  meta: boolean | null
}

export interface NuxtConfig extends _NuxtConfig {
  head?: _NuxtConfig['head'] | MetaInfo | (() => MetaInfo)
}

declare module '@nuxt/schema' {
  interface NuxtConfig {
    bridge?: Partial<BridgeConfig> | false
  }
}

export declare function defineNuxtConfig (config: NuxtConfig): NuxtConfig
