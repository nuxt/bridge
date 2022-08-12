import { createRequire } from 'module'
import { defineNuxtModule, installModule, checkNuxtCompatibility } from '@nuxt/kit'
import type { NuxtModule } from '@nuxt/schema'
import { NuxtCompatibility } from '@nuxt/schema'
import type { BridgeConfig } from '../types'
import { setupNitroBridge } from './nitro'
import { setupAppBridge } from './app'
import { setupCAPIBridge } from './capi'
import { setupBetterResolve } from './resolve'
import autoImports from './auto-imports/module'
import { setupTypescript } from './typescript'
import { setupMeta } from './meta'
import { setupTranspile } from './transpile'
import { generateWebpackBuildManifest } from './webpack/manifest'

export default defineNuxtModule({
  meta: {
    name: 'nuxt-bridge',
    configKey: 'bridge'
  },
  defaults: {
    nitro: true,
    nitroGenerator: true,
    vite: false,
    app: {},
    capi: {},
    transpile: true,
    autoImports: true,
    compatibility: true,
    meta: null,
    // TODO: Remove from 2.16
    postcss8: true,
    typescript: true,
    resolve: true
  } as BridgeConfig,
  async setup (opts, nuxt) {
    // Disable if users explicitly set to false
    if ((nuxt.options as any).bridge === false) { return }

    if (!(nuxt.options as any).bridge._version) {
      throw new Error('[bridge] Bridge must be enabled by using `defineNuxtConfig` to wrap your Nuxt configuration.')
    }

    if (opts.nitro) {
      nuxt.hook('modules:done', async () => {
        await setupNitroBridge()
      })
    }
    if (opts.app) {
      await setupAppBridge(opts.app)
    }
    if (opts.capi) {
      if (!opts.app) {
        throw new Error('[bridge] Cannot enable composition-api with app disabled!')
      }
      await setupCAPIBridge(opts.capi === true ? {} : opts.capi)
    }
    if (opts.autoImports) {
      nuxt.hook('modules:done', () => installModule(autoImports))
    }
    if (opts.vite) {
      const viteModule = await import('./vite/module').then(r => r.default || r) as NuxtModule
      nuxt.hook('modules:done', () => installModule(viteModule))
    } else {
      // with webpack, we need to transpile vue to handle the default/named exports in Vue 2.7
      nuxt.options.build.transpile.push('vue')
      nuxt.hook('build:done', async () => {
        if (!nuxt.options.dev) {
          await generateWebpackBuildManifest()
        }
      })
    }
    if (opts.postcss8) {
      const _require = createRequire(import.meta.url)
      await installModule(_require.resolve('@nuxt/postcss8'))
    }
    if (opts.typescript) {
      await setupTypescript()
    }
    if (opts.resolve) {
      setupBetterResolve()
    }
    if (opts.transpile) {
      setupTranspile()
    }
    if (opts.compatibility) {
      nuxt.hook('modules:done', async (moduleContainer: any) => {
        for (const [name, m] of Object.entries(moduleContainer.requiredModules || {})) {
          const compat = ((m as any)?.handler?.meta?.compatibility || {}) as NuxtCompatibility
          if (compat) {
            const issues = await checkNuxtCompatibility(compat, nuxt)
            if (issues.length) {
              console.warn(`[bridge] Detected module incompatibility issues for \`${name}\`:\n` + issues.toString())
            }
          }
        }
      })
    }
    if (opts.meta !== false && opts.capi) {
      await setupMeta({ needsExplicitEnable: opts.meta === null })
    }
  }
})
