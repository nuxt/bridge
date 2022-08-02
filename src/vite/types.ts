import type { InlineConfig, SSROptions } from 'vite'
import type { Options as VueViteOptions } from '@vitejs/plugin-vue2'
import type { Options as LegacyViteOptions } from '@vitejs/plugin-legacy'

export interface Nuxt {
  options: any;
  resolver: any;
  hook: Function;
  callHook: Function;
}

export interface ViteOptions extends Omit<InlineConfig, 'build'> {
  /**
   * Options for @vitejs/plugin-vue2
   *
   * @see https://github.com/vitejs/vite-plugin-vue2
   */
  vue?: VueViteOptions

  /**
   * Options for @vitejs/plugin-legacy
   *
   * @see https://github.com/vitejs/vite-plugin-vue2
   */
  legacy?: LegacyViteOptions

  ssr?: boolean | SSROptions

  build?: boolean | InlineConfig['build']

  experimentWarning?: boolean
}

export interface ViteBuildContext {
  nuxt: Nuxt;
  builder: {
    plugins: { name: string; mode?: 'client' | 'server'; src: string; }[];
  };
  config: ViteOptions;
}
