import { defineEventHandler } from 'h3'
import { defineNuxtConfig } from '@nuxt/bridge'

// @ts-ignore
global.__NUXT_PREPATHS__ = (global.__NUXT_PREPATHS__ || []).concat(__dirname)

const bridgeConfig = {
  vite: process.env.TEST_BUILDER !== 'webpack',
  transpile: process.env.TEST_TRANSPILE !== 'false',
  compatibility: process.env.TEST_COMPATIBILITY !== 'false',
  resolve: process.env.TEST_RESOLVE !== 'false',
  // Not yet tested in matrix
  nitro: process.env.TEST_NITRO !== 'false',
  nitroGenerator: process.env.TEST_NITRO_GENERATOR !== 'false',
  imports: process.env.TEST_IMPORTS !== 'false',
  meta: process.env.TEST_META !== 'false',
  typescript: process.env.TEST_TYPESCRIPT !== 'false',
}

console.log('Bridge config:', bridgeConfig)

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
  plugins: ['~/plugins/setup.js'],
  nitro: {
    routeRules: {
      '/route-rules/spa': { ssr: false }
    },
    plugins: ['plugins/template.ts']
  },
  bridge: bridgeConfig,
  runtimeConfig: {
    secretKey: 'nuxt',
    public: {
      myValue: 123
    }
  }
})
