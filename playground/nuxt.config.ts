import { defineEventHandler } from 'h3'
import { defineNuxtConfig } from '..'

// @ts-ignore
global.__NUXT_PREPATHS__ = (global.__NUXT_PREPATHS__ || []).concat(__dirname)

export default defineNuxtConfig({
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
  buildDir: process.env.NITRO_BUILD_DIR,
  plugins: ['~/plugins/setup.js'],
  nitro: {
    routeRules: {
      '/route-rules/spa': { ssr: false }
    },
    output: { dir: process.env.NITRO_OUTPUT_DIR }
  },
  bridge: {
    meta: true,
    vite: !process.env.TEST_WITH_WEBPACK
  },
  runtimeConfig: {
    secretKey: 'nuxt',
    public: {
      myValue: 123
    }
  }
})
