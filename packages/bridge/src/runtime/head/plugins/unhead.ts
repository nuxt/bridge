import { createHead as createClientHead, createServerHead } from '@unhead/vue'
import { markRaw } from 'vue'
import { renderSSRHead } from '@unhead/ssr'
import { defineNuxtPlugin } from '../../app'
import { UnheadPlugin } from './vue2-plugin'
// @ts-ignore
import metaConfig from '#build/meta.config.mjs'

export default defineNuxtPlugin((nuxtApp) => {
  const createHead = process.server ? createServerHead : createClientHead
  const head = createHead()
  head.push(markRaw(metaConfig.globalMeta))

  // instead of $options.unhead
  nuxtApp.provide('unhead', head)
  nuxtApp.vueApp.use(UnheadPlugin)

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
