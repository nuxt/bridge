import type { InlineConfig, ViteDevServer } from 'vite'
import type { Options as VueViteOptions } from '@vitejs/plugin-vue2'

export interface Nuxt {
  options: any
  resolver: any
  hook: Function
  callHook: Function
}

export interface ViteOptions extends InlineConfig {
  /**
   * Options for @vitejs/plugin-vue2
   *
   * @see https://github.com/vitejs/vite-plugin-vue2
   */
  vue?: VueViteOptions

  experimentWarning?: boolean
}

export interface ViteBuildContext {
  nuxt: Nuxt
  config: ViteOptions
  clientServer?: ViteDevServer
  ssrServer?: ViteDevServer
  builder: {
    plugins: Array<{
      name: string
      src: string
      mode?: 'client' | 'server'
    }>
  }
}
