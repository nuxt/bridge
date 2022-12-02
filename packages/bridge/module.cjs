// CommonJS proxy to bypass jiti transforms from nuxt 2
module.exports = function (...args) {
  return import('./dist/module.mjs').then(m => m.default.call(this, ...args))
}

const pkg = require('./package.json')

module.exports.defineNuxtConfig = (config = {}) => {
  if (config.bridge === false) { return config }

  // Add new handlers options
  config.serverHandlers = config.serverHandlers || []
  config.devServerHandlers = config.devServerHandlers || []
  config.devServer = config.devServer || {}

  // Initialize typescript config for nuxi typecheck + prepare support
  config.typescript = config.typescript || {}

  // Nuxt kit depends on this flag to check bridge compatibility
  config.bridge = typeof config.bridge === 'object' ? config.bridge : {}
  config.bridge._version = pkg.version
  if (!config.buildModules) {
    config.buildModules = []
  }
  if (!config.buildModules.find(m => m === '@nuxt/bridge' || m === '@nuxt/bridge-edge')) {
    // Ensure other modules register their hooks before
    config.buildModules.push('@nuxt/bridge')
  }
  config.buildModules.unshift(async function () {
    const nuxt = this.nuxt

    const { nuxtCtx } = await import('@nuxt/kit')

    // Allow using kit composables in all modules
    if (nuxtCtx.tryUse()) {
      nuxtCtx.unset()
    }
    nuxtCtx.set(nuxt)

    // Mock _layers for nitro and auto-imports
    nuxt.options._layers = nuxt.options._layers || [{
      config: nuxt.options,
      cwd: nuxt.options.rootDir,
      configFile: nuxt.options._nuxtConfigFile
    }]
  })
  return config
}

module.exports.meta = {
  pkg,
  name: pkg.name,
  version: pkg.version
}
