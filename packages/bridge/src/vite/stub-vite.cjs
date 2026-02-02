// CommonJS proxy to bypass jiti transforms from nuxt 2

/** @type {typeof import('vite')} */
module.exports = {
  mergeConfig: function (...args) {
    return import('vite').then(m => m.mergeConfig.call(this, ...args))
  },
  createServer: function (...args) {
    return import('vite').then(m => m.createServer.call(this, ...args))
  },
  build: function (...args) {
    return import('vite').then(m => m.build.call(this, ...args))
  }
}
