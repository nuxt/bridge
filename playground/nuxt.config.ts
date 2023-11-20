import { defineEventHandler } from 'h3'
import { defineNuxtConfig } from '@nuxt/bridge'

// @ts-ignore
global.__NUXT_PREPATHS__ = (global.__NUXT_PREPATHS__ || []).concat(__dirname)

export default defineNuxtConfig({
  app: {
    head: {
      meta: [
        { name: 'viewport', content: 'width=1024, initial-scale=1' },
        { charset: 'utf-8' },
        { name: 'description', content: 'Nuxt Fixture' }
      ]
    }
  },
  components: true,
  serverMiddleware: [
    {
      handle: defineEventHandler((event) => {
        event.node.req.spa = event.node.req.url.includes('?spa')
      })
    }
  ],
  modules: [
    function () {
      this.nuxt.options.plugins.unshift({
        src: '~/plugins/config'
      })
    }
  ],
  plugins: ['~/plugins/setup.js', '~/plugins/store.js'],
  nitro: {
    routeRules: {
      '/route-rules/spa': { ssr: false }
    },
    plugins: ['plugins/template.ts']
  },
  vite: {
    build: {
      assetsInlineLimit: 100 // keep SVG as assets URL
    }
  },
  bridge: {
    meta: true,
    vite: !process.env.TEST_WITH_WEBPACK,
    macros: {
      pageMeta: true
    }
  },
  runtimeConfig: {
    secretKey: 'nuxt',
    public: {
      myValue: 123
    }
  }
})
