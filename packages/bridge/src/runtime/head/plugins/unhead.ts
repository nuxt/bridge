import {
  createHead as createClientHead,
  createServerHead,
  setHeadInjectionHandler,
  Vue2ProvideUnheadPlugin
} from '@unhead/vue'
import { markRaw } from 'vue'
import { renderSSRHead } from '@unhead/ssr'
import { defineNuxtPlugin, useNuxtApp } from '../../nuxt'
// @ts-ignore
import metaConfig from '#build/meta.config.mjs'

export default defineNuxtPlugin((nuxtApp) => {
  const createHead = process.server ? createServerHead : createClientHead
  const head = createHead()
  head.push(markRaw(metaConfig.globalMeta))
  // TODO the replacement plugin has issues in Nuxt, needs to be fixed upstream
  nuxtApp.vueApp.use(Vue2ProvideUnheadPlugin, head)
  nuxtApp.vueApp.config.globalProperties.$head = head

  // allow useHead to be used outside a Vue context but within a Nuxt context
  setHeadInjectionHandler(
    // need a fresh instance of the nuxt app to avoid parallel requests interfering with each other
    () => useNuxtApp().vueApp.config.globalProperties.$head
  )

  if (process.server) {
    nuxtApp.ssrContext!.renderMeta = async () => {
      const meta = await renderSSRHead(head)
      return {
        ...meta,
        bodyScriptsPrepend: meta.bodyTagsOpen,
        // resolves naming difference with NuxtMeta and Unhead
        bodyScripts: meta.bodyTags
      }
    }
  }
})
