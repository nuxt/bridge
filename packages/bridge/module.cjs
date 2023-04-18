// CommonJS proxy to bypass jiti transforms from nuxt 2
module.exports = function (...args) {
  return import('./dist/module.mjs').then(m => m.default.call(this, ...args))
}

const { resolve } = require('path')
const { loadConfig } = require('c12')
const pkg = require('./package.json')

const getCwd = () => {
  const cliArgv = JSON.parse(process.env.__CLI_ARGV__ || '[]')
  const processArgv = process.argv
  const cwd = process.cwd()
  // check if process.argv has 3rd argument which doesn't start with `-`
  if (processArgv[3] && !processArgv[3].startsWith('-')) {
    return resolve(cwd, processArgv[3])
  }
  // check if process.env.__CLI_ARGV__ has 3rd argument which doesn't start with `-`
  if (cliArgv[3] && !cliArgv[3].startsWith('-')) {
    return resolve(cwd, cliArgv[3])
  }
  // fallback to cwd
  return cwd
}

const getNuxiMode = () => {
  const cliArgv = JSON.parse(process.env.__CLI_ARGV__ || '[]')
  const processArgv = process.argv
  // check if process.argv has 2nd argument which doesn't start with `-`
  if (processArgv[2] && !processArgv[2].startsWith('-')) {
    return processArgv[2]
  }
  // check if process.env.__CLI_ARGV__ has 2nd argument which doesn't start with `-`
  if (cliArgv[2] && !cliArgv[2].startsWith('-')) {
    return cliArgv[2]
  }
}

const loadC12Config = async () => {
  return await loadConfig({
    name: 'nuxt',
    rcFile: '.nuxtrc',
    configFile: 'nuxt.config',
    extend: { extendKey: ['theme', 'extends'] },
    dotenv: true,
    globalRc: true,
    cwd: getCwd()
  })
}

const nuxiMode = getNuxiMode()
// in dev mode initial config loaded twice, so we triggers only on 2nd loading
const isDev = nuxiMode === 'dev'
const stopCount = isDev ? 1 : 0
let processingCounter = 0

module.exports.defineNuxtConfig = (config = {}) => {
  return async () => {
    if (config.bridge === false) { return config }
    // I suppose we'll have only one bridge config in a project
    if (config.bridge?.config) {
      if (processingCounter === stopCount) {
        processingCounter += 1
        const c12Config = await loadC12Config()
        c12Config.config._layers = c12Config.layers || []
        return c12Config.config
      } else {
        processingCounter += 1
      }
    }

    // Add new handlers options
    config.serverHandlers = config.serverHandlers || []
    config.devServerHandlers = config.devServerHandlers || []
    config.devServer = config.devServer || {}

    config.dir = config.dir || {}

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
}

module.exports.meta = {
  pkg,
  name: pkg.name,
  version: pkg.version
}