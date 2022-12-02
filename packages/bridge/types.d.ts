/// <reference types="nitropack" />
import type { Nuxt2Config } from '@nuxt/bridge-schema'
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
