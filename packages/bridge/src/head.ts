import { resolve } from 'pathe'
import { addComponent, addImportsSources, addPlugin, addTemplate, defineNuxtModule } from '@nuxt/kit'
import { defu } from 'defu'
import type { MetaObject } from '@nuxt/schema'
import { distDir } from './dirs'

const components = ['NoScript', 'Link', 'Base', 'Title', 'Meta', 'Style', 'Head', 'Html', 'Body']

export default defineNuxtModule({
  meta: {
    name: 'meta'
  },
  defaults: {
    charset: 'utf-8',
    viewport: 'width=device-width, initial-scale=1'
  },
  setup (options, nuxt) {
    const runtimeDir = nuxt.options.alias['#head'] || resolve(distDir, 'head/runtime')

    // Transpile @unhead/vue and @unhead/ssr
    nuxt.options.build.transpile.push('unhead')

    // Add #head alias
    nuxt.options.alias['#head'] = runtimeDir

    // Register components
    const componentsPath = resolve(runtimeDir, 'components')
    for (const componentName of components) {
      addComponent({
        name: componentName,
        filePath: componentsPath,
        export: componentName,
        // built-in that we do not expect the user to override
        priority: 10,
        // kebab case version of these tags is not valid
        kebabName: componentName
      })
    }

    // Global meta -for Bridge, this is necessary to repeat here
    // and in packages/schema/src/config/_app.ts
    const globalMeta: MetaObject = defu(nuxt.options.app.head, {
      charset: options.charset,
      viewport: options.viewport
    })

    // Add global meta configuration
    addTemplate({
      filename: 'meta.config.mjs',
      getContents: () => 'export default ' + JSON.stringify({ globalMeta, mixinKey: 'setup' })
    })

    addImportsSources({
      from: '@unhead/vue',
      // hard-coded for now we so don't support auto-imports on the deprecated composables
      imports: [
        'injectHead',
        'useHead',
        'useSeoMeta',
        'useHeadSafe',
        'useServerHead',
        'useServerSeoMeta',
        'useServerHeadSafe'
      ]
    })

    // Add generic plugin
    addPlugin({ src: resolve(runtimeDir, 'plugin') })

    // Add library-specific plugin
    addPlugin({ src: resolve(runtimeDir, 'plugins/unhead') })
  }
})
