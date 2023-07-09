import { createHead as createClientHead, createServerHead, Vue2ProvideUnheadPlugin } from '@unhead/vue'
import { markRaw } from 'vue'
import { renderSSRHead } from '@unhead/ssr'
import { defineNuxtPlugin } from '../../app'
// @ts-ignore
import metaConfig from '#build/meta.config.mjs'

export default defineNuxtPlugin((nuxtApp) => {
  const createHead = process.server ? createServerHead : createClientHead
  const head = createHead()
  head.push(markRaw(metaConfig.globalMeta))

  nuxtApp.vueApp.use(Vue2ProvideUnheadPlugin, head)
  nuxtApp.vueApp.use(head)

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
