import { useNuxt, addTemplate, resolveAlias, addWebpackPlugin, addVitePlugin, addPlugin, tryResolveModule } from '@nuxt/kit'
import { NuxtModule } from '@nuxt/schema'
import { normalize, resolve } from 'pathe'
import { resolveImports } from 'mlly'
import { componentsTypeTemplate, schemaTemplate, middlewareTypeTemplate } from './type-templates'
import { distDir } from './dirs'
import { VueCompat } from './vue-compat'
import { globalMiddlewareTemplate } from './global-middleware-template'

export async function setupAppBridge (_options: any) {
  const nuxt = useNuxt()

  // Setup aliases
  nuxt.options.alias['#app'] = resolve(distDir, 'runtime')
  nuxt.options.alias['nuxt3/app'] = nuxt.options.alias['#app']
  nuxt.options.alias['nuxt/app'] = nuxt.options.alias['#app']
  nuxt.options.alias['#build'] = nuxt.options.buildDir

  // Transpile internal runtime directory when developing module (windows)
  nuxt.options.build.transpile.push(resolve(distDir, 'runtime').replace('dist', 'src'))

  // Transpile build directory (windows)
  nuxt.options.build.transpile.push(normalize(nuxt.options.buildDir))

  // Mock `bundleBuilder.build` to support `nuxi prepare`
  if (nuxt.options._prepare) {
    nuxt.hook('builder:prepared', (builder) => {
      builder.bundleBuilder.build = () => Promise.resolve(builder.bundleBuilder)
    })
  }

  nuxt.hook('builder:prepared', (builder) => {
    nuxt.hook('build:done', () => {
      for (const name of ['app', 'files', 'custom']) {
        builder.watchers[name]?.on('all', (event, path) => nuxt.callHook('builder:watch', event, path))
      }
    })
    nuxt.hook('builder:generateApp', () => builder.generateRoutesAndFiles())
  })

  // Transpile core vue libraries
  // TODO: resolve in vercel/nft
  nuxt.options.build.transpile.push('vuex')

  // Transpile libs with modern syntax
  nuxt.options.build.transpile.push('h3', 'iron-webcrypto', 'ohash', 'ofetch', 'unenv')

  // Transpile @unhead/vue and @unhead/ssr
  nuxt.options.build.transpile.push('unhead')

  // Disable legacy fetch polyfills
  nuxt.options.fetch.server = false
  nuxt.options.fetch.client = false

  // Setup types for components
  const components = []
  nuxt.hook('components:extend', (registeredComponents) => {
    components.push(...registeredComponents)
  })
  addTemplate({
    ...componentsTypeTemplate,
    options: { components, buildDir: nuxt.options.buildDir }
  })

  addTemplate(middlewareTypeTemplate)

  nuxt.hook('prepare:types', ({ references }) => {
    references.push({ path: resolve(nuxt.options.buildDir, 'types/components.d.ts') })
    references.push({ path: resolve(nuxt.options.buildDir, 'types/middleware.d.ts') })
  })

  // Augment schema with module types
  nuxt.hook('modules:done', async (container: any) => {
    nuxt.options._installedModules = await Promise.all(Object.values(container.requiredModules).map(async (m: { src: string, handler: NuxtModule }) => ({
      meta: await m.handler.getMeta?.(),
      entryPath: resolveAlias(m.src, nuxt.options.alias)
    })))
    addTemplate(schemaTemplate)
  })
  nuxt.hook('prepare:types', ({ references }) => {
    // Add module augmentations directly to NuxtConfig
    references.push({ path: resolve(nuxt.options.buildDir, 'types/schema.d.ts') })
  })

  // Add helper for composition API utilities
  addTemplate({
    filename: 'composition-globals.mjs',
    getContents: () => {
      const globals = {
        // useFetch
        isFullStatic:
          !nuxt.options.dev &&
          !nuxt.options._legacyGenerate &&
          nuxt.options.target === 'static' &&
          nuxt.options.render?.ssr
      }

      const contents = Object.entries(globals)
        .map(([key, value]) => `export const ${key} = ${JSON.stringify(value)}`)
        .join('\n')

      return contents
    }
  })

  addTemplate(globalMiddlewareTemplate)

  // Alias vue3 utilities to vue2
  const { dst: vueCompat } = addTemplate({ src: resolve(distDir, 'runtime/vue2-bridge.mjs') })
  addWebpackPlugin(VueCompat.webpack({ src: vueCompat }))
  addVitePlugin(VueCompat.vite({ src: vueCompat }))

  nuxt.hook('prepare:types', ({ tsConfig }) => {
    // Enable Volar support with vue 2 compat mode
    // @ts-ignore
    tsConfig.vueCompilerOptions = {
      target: 2.7
    }
  })

  // Deprecate various Nuxt options
  if (nuxt.options.globalName !== 'nuxt') {
    throw new Error('Custom global name is not supported by @nuxt/bridge.')
  }

  // Alias defu to compat version - we deliberately want the local (v6) version of defu
  nuxt.options.alias.defu = await resolveImports('defu', { conditions: ['import'] })

  // Alias hookable - need to use v5 for compatibility with upstream
  const hookableUrl = await tryResolveModule('hookable', nuxt.options.modulesDir) || 'hookable'
  nuxt.options.alias.hookable = hookableUrl

  // Fix wp4 esm
  nuxt.hook('webpack:config', (configs) => {
    for (const config of configs.filter(c => c.module)) {
      // @ts-ignore
      const jsRule: any = config.module.rules.find(rule => rule.test instanceof RegExp && rule.test.test('index.mjs'))
      jsRule.type = 'javascript/auto'

      config.module.rules.unshift({
        test: /\.mjs$/,
        type: 'javascript/auto',
        include: [/node_modules/]
      })
    }
  })

  // Normalize runtimeConfig with a proxy
  nuxt.hook('modules:done', () => {
    nuxt.options.plugins.unshift({ src: resolve(distDir, 'runtime/config.plugin.mjs') })
  })

  addPlugin({
    src: resolve(distDir, 'runtime/error.plugin.server.mjs'),
    mode: 'server'
  })
}
