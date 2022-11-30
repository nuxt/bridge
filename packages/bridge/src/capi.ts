import { useNuxt, addPluginTemplate, addVitePlugin, addWebpackPlugin } from '@nuxt/kit'
import { resolve } from 'pathe'
import { BridgeConfig } from '../../../types'
import { distDir } from './dirs'
import { KeyPlugin } from './capi-legacy-key-plugin'

export function setupCAPIBridge (options: Exclude<BridgeConfig['capi'], boolean>) {
  const nuxt = useNuxt()

  // Error if `@nuxtjs/composition-api` is added
  if (nuxt.options.buildModules.find(m => m === '@nuxtjs/composition-api' || m === '@nuxtjs/composition-api/module')) {
    throw new Error('Please remove `@nuxtjs/composition-api` from `buildModules` to avoid conflict with bridge.')
  }

  // Add support for onGlobalSetup
  const capiPluginPath = resolve(distDir, 'runtime/capi.plugin.mjs')
  addPluginTemplate({ filename: 'capi.plugin.mjs', src: capiPluginPath })

  // Add support for useNuxtApp
  const appPlugin = addPluginTemplate(resolve(distDir, 'runtime/app.plugin.mjs'))
  nuxt.hook('modules:done', () => {
    nuxt.options.plugins.unshift(appPlugin)
  })

  // Transpile vue-router to ensure single vue instance
  nuxt.options.build.transpile.push('vue-router')

  if (options.legacy === false) {
    // Skip adding `@nuxtjs/composition-api` handlers if legacy support is disabled
    return
  }

  // Handle legacy `@nuxtjs/composition-api`
  nuxt.options.alias['@nuxtjs/composition-api'] = resolve(distDir, 'runtime/capi.legacy')
  nuxt.options.build.transpile.push('@nuxtjs/composition-api')

  // Enable automatic ssrRef key generation
  addVitePlugin(KeyPlugin.vite())
  addWebpackPlugin(KeyPlugin.webpack())
}
