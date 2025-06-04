import { defineConfig } from 'vitest/config'
import { resolve } from 'pathe'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          include: ['test/**/*.test.ts'],
          exclude: ['test/nuxt/**/*.test.ts']
        }
      },
      {
        test: {

          include: ['test/**/*.nuxt.test.ts'],
          environment: 'happy-dom',
          alias: {
            '#app': resolve('./packages/bridge/src/runtime/index')
          }
        },
        define: {
          'process.client': 'true'
        }
      }
    ]
  }
})
