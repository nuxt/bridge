import { defineNuxtConfig } from '@nuxt/bridge'

export default defineNuxtConfig({
  app: {
    head: {
      title: 'Nuxt Bridge Playground',
      meta: [
        { hid: 'layer', name: 'layer', content: 'layer activated' }
      ]
    }
  }
})
