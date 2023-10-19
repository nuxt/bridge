import { defineNuxtModule, addWebpackPlugin, addVitePlugin } from '@nuxt/kit'
import { resolve } from 'pathe'
import { distDir } from '../dirs'
import { PageMetaPlugin } from './transform'
import type { PageMetaPluginOptions } from './transform'

export default defineNuxtModule({
  meta: {
    name: 'page-meta',
    configKey: 'pageMeta'
  },
  setup (_, nuxt) {
    const pageMetaOptions: PageMetaPluginOptions = {
      sourcemap: true // nuxt.options.sourcemap not yet supported
    }

    addVitePlugin(PageMetaPlugin.vite(pageMetaOptions))
    addWebpackPlugin(PageMetaPlugin.webpack(pageMetaOptions))

    const runtimeDir = resolve(distDir, 'runtime')

    nuxt.hook('imports:extend', (imports) => {
      imports.push({
        name: 'definePageMeta',
        as: 'definePageMeta',
        from: resolve(runtimeDir, 'page-meta/composables')
      })
    })
  }
})
