// CommonJS proxy to bypass jiti transforms from nuxt 2
module.exports = function (...args) {
  return import('./dist/module.mjs').then(m => m.default.call(this, ...args))
}

const { resolve } = require('pathe')
const { loadConfig } = require('c12')
const pkg = require('./package.json')
const { processPages } = require('./builderReplacement.cjs')

const getRootDir = () => {
  const cwd = process.cwd()
  const parentModulePath = module.parent?.path
  return parentModulePath ?? cwd
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

const nuxiMode = getNuxiMode()
const isDev = nuxiMode === 'dev'

const loadC12Config = async (rootDir) => {
  return await loadConfig({
    name: 'nuxt',
    rcFile: '.nuxtrc',
    configFile: 'nuxt.config',
    extend: { extendKey: ['theme', 'extends'] },
    dotenv: true,
    globalRc: true,
    cwd: rootDir ?? getRootDir()
  })
}

// in dev mode initial config loaded twice, so we triggers only on 2nd loading
const stopCount = isDev ? 1 : 0
let processingCounter = 0
let isVite = false

const shouldEnterC12 = () => {
  if (isVite) {
    return processingCounter === stopCount
  } else {
    return !new Error('_').stack.includes(loadC12Config.name)
  }
}

module.exports.defineNuxtConfig = (config = {}) => {
  return async () => {
    if (config.bridge === false) { return config }
    if (config.bridge?.vite) {
      isVite = true
    }
    // I suppose we'll have only one bridge config in a project
    if (config.bridge?.config) {
      // try to check if we are not in a c12
      if (shouldEnterC12()) {
        processingCounter += 1
        const result = await loadC12Config(config.rootDir)
        const { configFile, layers = [], cwd } = result
        const nuxtConfig = result.config

        if (!nuxtConfig) {
          throw new Error('No nuxt config found')
        }

        // Fill config
        nuxtConfig.rootDir = nuxtConfig.rootDir || cwd
        nuxtConfig._nuxtConfigFile = configFile
        nuxtConfig._nuxtConfigFiles = [configFile]

        // Resolve `rootDir` & `srcDir` of layers
        for (const layer of layers) {
          layer.config = layer.config || {}
          layer.config.rootDir = layer.config.rootDir ?? layer.cwd
          layer.config.srcDir = resolve(layer.config.rootDir, layer.config.srcDir)
        }

        // Filter layers
        const _layers = layers.filter(layer => layer.configFile && !layer.configFile.endsWith('.nuxtrc'))
        nuxtConfig._layers = _layers

        // Ensure at least one layer remains (without nuxt.config)
        if (!_layers.length) {
          _layers.push({
            cwd,
            config: {
              rootDir: cwd,
              srcDir: cwd
            }
          })
        }
        processPages(nuxtConfig)
        return nuxtConfig
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
