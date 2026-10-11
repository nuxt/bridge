import { fileURLToPath } from 'url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '#build/fetch.mjs': fileURLToPath(new URL('./packages/bridge/test/mocks/fetch.mjs', import.meta.url))
    }
  }
})
