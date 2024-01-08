import {
  createHead as createClientHead,
  setHeadInjectionHandler,
  Vue2ProvideUnheadPlugin
} from '@unhead/vue'
import { defineNuxtPlugin, useNuxtApp } from '../../nuxt'

export default defineNuxtPlugin((nuxtApp) => {
  const head = process.server ? nuxtApp.ssrContext!.head : createClientHead()

  // TODO the replacement plugin has issues in Nuxt, needs to be fixed upstream
  nuxtApp.vueApp.use(Vue2ProvideUnheadPlugin, head)
  nuxtApp.vueApp.config.globalProperties.$head = head

  // allow useHead to be used outside a Vue context but within a Nuxt context
  setHeadInjectionHandler(
    // need a fresh instance of the nuxt app to avoid parallel requests interfering with each other
    () => useNuxtApp().vueApp.config.globalProperties.$head
  )
})
