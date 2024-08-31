import { promises as fsp, existsSync } from 'fs'
import { pathToFileURL } from 'url'
import fetch from 'node-fetch'
import fsExtra from 'fs-extra'
import { addPluginTemplate, resolvePath, tryImportModule, useNuxt } from '@nuxt/kit'
import { joinURL, stringifyQuery, withBase, withoutTrailingSlash } from 'ufo'
import { resolve, join, dirname, normalize } from 'pathe'
import { createNitro, createDevServer, build, writeTypes, prepare, copyPublicAssets, prerender } from 'nitropack'
import { dynamicEventHandler } from 'h3'
import type { Nitro, NitroEventHandler, NitroDevEventHandler, NitroConfig } from 'nitropack'
import { Nuxt, NuxtPage } from '@nuxt/schema'
import { defu } from 'defu'
import { normalizeWebpackManifest } from 'vue-bundle-renderer'
import { AsyncLoadingPlugin } from './async-loading'
import { distDir } from './dirs'
import { isDirectory, readDirRecursively } from './vite/utils/fs'

export async function setupNitroBridge () {
  const nuxt = useNuxt() as Nuxt & { _nitro?: Nitro }

  // Ensure we're not just building with 'static' target
  if (!nuxt.options.dev && nuxt.options.target === 'static' && !nuxt.options._prepare && !nuxt.options._generate && !(nuxt.options as any)._export && !nuxt.options._legacyGenerate) {
    throw new Error('[nitro] Please use `nuxt generate` for static target')
  }

  // Handle legacy property name `assetsPath`
  // @ts-expect-error `assetsPath` is legacy options
  nuxt.options.app.buildAssetsDir = nuxt.options.app.buildAssetsDir || nuxt.options.app.assetsPath
  // @ts-expect-error `assetsPath` is legacy options
  nuxt.options.app.assetsPath = nuxt.options.app.buildAssetsDir
  nuxt.options.app.baseURL = nuxt.options.app.baseURL || (nuxt.options.app as any).basePath
  nuxt.options.app.cdnURL = nuxt.options.app.cdnURL || ''
  // @ts-expect-error `publicPath` is legacy options
  nuxt.options.build.publicPath = nuxt.options.app.cdnURL || nuxt.options.build.publicPath

  // Extract publicConfig and app
  const publicConfig = nuxt.options.publicRuntimeConfig
  const appConfig = { ...publicConfig._app, ...publicConfig.app }
  delete publicConfig.app
  delete publicConfig._app

  // Merge with new `runtimeConfig` format
  nuxt.options.runtimeConfig = defu(nuxt.options.runtimeConfig, {
    ...publicConfig,
    ...nuxt.options.privateRuntimeConfig,
    public: publicConfig,
    app: appConfig
  })

  // Disable loading-screen
  // @ts-ignore
  nuxt.options.build.loadingScreen = false
  // @ts-ignore
  nuxt.options.build.indicator = false

  if (nuxt.options.build.analyze === true) {
    const { rootDir } = nuxt.options
    nuxt.options.build.analyze = {
      template: 'treemap',
      projectRoot: rootDir,
      filename: join(rootDir, '.nuxt/stats', '{name}.html')
    }
  }

  // Resolve config
  const _nitroConfig = (nuxt.options as any).nitro || {} as NitroConfig
  const routes = Array.isArray(nuxt.options.generate.routes) ? nuxt.options.generate.routes : []
  const nitroConfig: NitroConfig = defu(_nitroConfig, <NitroConfig> {
    rootDir: resolve(nuxt.options.rootDir),
    srcDir: resolve(nuxt.options.srcDir, 'server'),
    dev: nuxt.options.dev,
    buildDir: resolve(nuxt.options.buildDir),
    scanDirs: nuxt.options._layers.map(layer => join(layer.config.srcDir, 'server')),
    renderer: resolve(distDir, 'runtime/nitro/renderer'),
    errorHandler: resolve(distDir, 'runtime/nitro/error'),
    nodeModulesDirs: nuxt.options.modulesDir,
    handlers: [],
    devHandlers: [],
    baseURL: nuxt.options.app.baseURL || '/',
    virtual: {},
    runtimeConfig: {
      ...nuxt.options.runtimeConfig,
      nitro: {
        envPrefix: 'NUXT_',
        ...nuxt.options.runtimeConfig.nitro
      }
    },
    typescript: {
      generateTsConfig: false
    },
    publicAssets: [
      {
        baseURL: (nuxt.options as any).bridge.vite ? '/' : nuxt.options.app.buildAssetsDir,
        dir: resolve(nuxt.options.buildDir, 'dist/client')
      },
      ...nuxt.options._layers
        .map(layer => join(layer.config.srcDir, layer.config.dir.static))
        .filter(dir => existsSync(dir))
        .map(dir => ({ dir }))
    ],
    prerender: {
      crawlLinks: nuxt.options._generate ? nuxt.options.generate.crawler : false,
      routes: []
        .concat(nuxt.options._generate ? ['/', ...routes] : [])
        .concat(nuxt.options.ssr === false ? ['/', '/200', '/404'] : [])
    },
    externals: {
      inline: [
        ...(nuxt.options.dev ? [] : ['vue', '@vue/', '@nuxt/', normalize(nuxt.options.buildDir)]),
        '@nuxt/bridge/dist',
        '@nuxt/bridge-edge/dist'
      ]
    },
    alias: {
      // Vue 2 mocks
      encoding: 'unenv/runtime/mock/proxy',
      he: 'unenv/runtime/mock/proxy',
      resolve: 'unenv/runtime/mock/proxy',
      'source-map': 'unenv/runtime/mock/proxy',
      'lodash.template': 'unenv/runtime/mock/proxy',
      'serialize-javascript': 'unenv/runtime/mock/proxy',

      // Renderer
      '#vue-renderer': resolve(distDir, 'runtime/nitro/vue2'),
      '#vue2-server-renderer': 'vue-server-renderer/' + (nuxt.options.dev ? 'build.dev.js' : 'build.prod.js'),

      // Paths
      '#paths': resolve(distDir, 'runtime/nitro/paths'),

      // Nuxt aliases
      ...nuxt.options.alias
    },
    replace: {
      'process.env.NUXT_NO_SSR': nuxt.options.ssr === false
    },
    rollupConfig: {
      plugins: []
    }
  })

  // Add fallback server for `ssr: false`
  if (!nuxt.options.ssr) {
    nitroConfig.virtual['#build/dist/server/server.mjs'] = 'export default () => {}'
  }

  // Let nitro handle #build for windows path normalization
  delete nitroConfig.alias['#build']

  if (nuxt.options.generate.routes instanceof Function && !nuxt.options.dev && !nuxt.options._prepare) {
    console.warn('It is recommended to migrate the `generate.routes` function to the `nitro:config` hook instead. See https://github.com/nuxt/bridge/pull/475.')
    nitroConfig.prerender.routes.push(...await nuxt.options.generate.routes() || [])
  }

  // Extend nitro config with hook
  await nuxt.callHook('nitro:config', nitroConfig)

  // Initiate nitro
  const nitro = await createNitro(nitroConfig)

  // Expose nitro to modules and kit
  nuxt._nitro = nitro
  await nuxt.callHook('nitro:init', nitro)

  // Shared vfs storage
  nitro.vfs = nuxt.vfs = nitro.vfs || nuxt.vfs || {}

  // Connect hooks
  nuxt.hook('close', () => nitro.hooks.callHook('close'))

  async function updateViteBase () {
    const clientDist = resolve(nuxt.options.buildDir, 'dist/client')

    // Remove public files that have been duplicated into buildAssetsDir
    // TODO: Add option to configure this behaviour in vite
    const publicDir = join(nuxt.options.srcDir, nuxt.options.dir.static)
    let publicFiles: string[] = []
    if (await isDirectory(publicDir)) {
      publicFiles = readDirRecursively(publicDir).map(r => r.replace(publicDir, ''))
      for (const file of publicFiles) {
        try {
          fsExtra.rmSync(join(clientDist, file))
        } catch {}
      }
    }

    // Copy doubly-nested /_nuxt/_nuxt files into buildAssetsDir
    // TODO: Workaround vite issue
    if (await isDirectory(clientDist)) {
      const nestedAssetsPath = withoutTrailingSlash(join(clientDist, nuxt.options.app.buildAssetsDir))

      if (await isDirectory(nestedAssetsPath)) {
        await fsExtra.copy(nestedAssetsPath, clientDist, { recursive: true })
        await fsExtra.remove(nestedAssetsPath)
      }
    }
  }
  nuxt.hook('generate:before', updateViteBase)

  // .ts is supported for serverMiddleware
  nuxt.options.extensions.push('ts')

  // Disable server sourceMap, esbuild will generate for it.
  nuxt.hook('webpack:config', (webpackConfigs) => {
    const serverConfig = webpackConfigs.find(config => config.name === 'server')
    if (serverConfig) {
      serverConfig.devtool = false
    }
  })

  // Set up webpack plugin for node async loading
  nuxt.hook('webpack:config', (webpackConfigs) => {
    const serverConfig = webpackConfigs.find(config => config.name === 'server')
    if (serverConfig) {
      serverConfig.plugins = serverConfig.plugins || []
      serverConfig.plugins.push(new AsyncLoadingPlugin({
        modulesDir: nuxt.options.modulesDir
      }) as any)
    }
  })

  // Nitro client plugin
  addPluginTemplate({
    filename: 'nitro-bridge.client.mjs',
    src: resolve(distDir, 'runtime/nitro-bridge.client.mjs')
  })

  // Nitro server plugin (for vue-meta)
  addPluginTemplate({
    filename: 'nitro-bridge.server.mjs',
    src: resolve(distDir, 'runtime/nitro-bridge.server.mjs')
  })

  // Fix module resolution
  nuxt.hook('webpack:config', (configs) => {
    for (const config of configs) {
      // We use only object form of alias in base config
      if (Array.isArray(config.resolve.alias)) { return }
      config.resolve.alias.ufo = 'ufo/dist/index.mjs'
      config.resolve.alias.ofetch = 'ofetch/dist/index.mjs'
      config.resolve.alias.ohmyfetch = 'ohmyfetch/dist/index.mjs'
    }
  })

  // Generate mjs resources
  nuxt.hook('build:compiled', async ({ name }) => {
    if (nuxt.options._prepare) { return }
    if (name === 'server') {
      const jsServerEntry = resolve(nuxt.options.buildDir, 'dist/server/server.js')
      await fsp.writeFile(jsServerEntry.replace(/.js$/, '.cjs'), 'module.exports = require("./server.js")', 'utf8')
      await fsp.writeFile(jsServerEntry.replace(/.js$/, '.mjs'), 'export { default } from "./server.cjs"', 'utf8')
    } else if (name === 'client' && nuxt.options.dev) {
      const manifest = await fsp.readFile(resolve(nuxt.options.buildDir, 'dist/server/client.manifest.json'), 'utf8')
      await fsp.writeFile(resolve(nuxt.options.buildDir, 'dist/server/client.manifest.mjs'), 'export default ' + JSON.stringify(normalizeWebpackManifest(JSON.parse(manifest)), null, 2), 'utf8')
    }
  })

  // Setup handlers
  const devMiddlewareHandler = dynamicEventHandler()
  nitro.options.devHandlers.unshift({ handler: devMiddlewareHandler })
  const { handlers, devHandlers } = await resolveHandlers(nuxt)
  nitro.options.handlers.push(...handlers)
  nitro.options.devHandlers.push(...devHandlers)
  nitro.options.handlers.unshift({
    route: '/__nuxt_error',
    lazy: true,
    handler: resolve(distDir, 'runtime/nitro/renderer')
  })

  // Create dev server
  if (nuxt.server) {
    nuxt.server.__closed = true
    nuxt.server = createNuxt2DevServer(nitro)
    nuxt.hook('build:resources', () => {
      nuxt.server.reload()
    })
  }

  // Add typed route responses
  nuxt.hook('prepare:types', (opts) => {
    opts.references.push({ path: resolve(nuxt.options.buildDir, 'types/nitro.d.ts') })
  })

  // nuxt prepare
  nuxt.hook('build:done', async () => {
    await writeTypes(nitro)
  })

  // nuxt build/dev
  // @ts-ignore
  nuxt.options.build._minifyServer = false
  nuxt.options.build.standalone = false

  const waitUntilCompile = new Promise<void>(resolve => nitro.hooks.hook('compiled', () => resolve()))
  nuxt.hook('build:done', async () => {
    if (nuxt.options._prepare) { return }
    await writeDocumentTemplate(nuxt)
    await nuxt.callHook('nitro:build:before', nitro)
    if (nuxt.options.dev) {
      await build(nitro)
      await waitUntilCompile
      // nitro.hooks.callHook('dev:reload')
    } else {
      await prepare(nitro)
      await copyPublicAssets(nitro)

      // Skip Nitro prerendering/building if using `nuxt generate`
      // and allow hooks below to handle
      if ((nuxt.options as any)._export || nuxt.options._legacyGenerate) {
        return
      }

      // Invokve classic generation behaviour with --classic CLI argument

      const useClassicGeneration = process.argv.includes('--classic') || (nuxt.options as any).bridge.nitroGenerator === false
      if (useClassicGeneration && nuxt.options._generate) {
        const { Generator } = (await tryImportModule('@nuxt/generator-edge')) || (await tryImportModule('@nuxt/generator'))
        const generator = new Generator(nuxt)
        await generator.generate({ build: false })
        return
      }

      await prerender(nitro)
      // Skip Nitro build if we are using `nuxi generate`
      if (!nuxt.options._generate) {
        await build(nitro)
      } else {
        const distDir = resolve(nuxt.options.rootDir, 'dist')
        if (!existsSync(distDir)) {
          await fsp.symlink(nitro.options.output.publicDir, distDir, 'junction').catch(() => {})
        }
      }
    }
  })

  // Prerender all non-dynamic page routes when generating app
  if (!nuxt.options.dev && nuxt.options._generate) {
    const routes = new Set<string>()
    nuxt.hook('build:extendRoutes', (pages) => {
      routes.clear()
      for (const path of nitro.options.prerender?.routes || []) {
        routes.add(path)
      }
      const processPages = (pages: NuxtPage[], currentPath = '/') => {
        for (const page of pages) {
          // Skip dynamic paths
          if (page.path.includes(':')) { continue }

          const path = joinURL(currentPath, page.path)
          routes.add(path)
          if (page.children) { processPages(page.children, path) }
        }
      }
      processPages(pages)
    })

    nuxt.hook('nitro:build:before', (nitro) => {
      nitro.options.prerender.routes = [...routes]
    })
  }

  // nuxt dev
  if (nuxt.options.dev) {
    nuxt.hook('build:compile', ({ compiler }) => {
      compiler.outputFileSystem = { ...fsExtra, join } as any
    })
    nuxt.hook('server:devHandler', (h) => { devMiddlewareHandler.set(h) })
  }

  // nuxt generate
  nuxt.options.generate.dir = nitro.options.output.publicDir
  nuxt.options.generate.manifest = false
  nuxt.hook('generate:cache:ignore', (ignore: string[]) => {
    ignore.push(nitro.options.output.dir)
    ignore.push(nitro.options.output.serverDir)
    if (nitro.options.output.publicDir) {
      ignore.push(nitro.options.output.publicDir)
    }
  })
  nuxt.hook('generate:before', async () => {
    await nuxt.server?.close()
  })
  nuxt.hook('generate:extendRoutes', async () => {
    nuxt.server = await createNuxt2Prerenderer(nitro)
    await nuxt.server.listen()
  })
  nuxt.hook('generate:done', async () => {
    await nuxt.server.close()
    await build(nitro)
  })
}

function createNuxt2DevServer (nitro: Nitro) {
  const server = createDevServer(nitro)

  const listeners = []
  async function listen (port) {
    const listener = await server.listen(port, {
      showURL: false,
      isProd: true
    })
    listeners.push(listener)
    return listener
  }

  async function renderRoute (route = '/', renderContext = {}) {
    const [listener] = listeners
    if (!listener) {
      throw new Error('There is no server listener to call `server.renderRoute()`')
    }
    const res = await fetch(joinURL(listener.url, route), {
      headers: { 'nuxt-render-context': stringifyQuery(renderContext) }
    })

    const html = await res.text()

    if (!res.ok) { return { html, error: res.statusText } }

    return { html }
  }

  return {
    ...server,
    listeners,
    renderRoute,
    listen,
    serverMiddlewarePaths () { return [] },
    ready () {}
  }
}

async function createNuxt2Prerenderer (nitro: Nitro) {
  const nitroRenderer = await createNitro({
    ...nitro.options._config,
    rootDir: nitro.options.rootDir,
    logLevel: 0,
    preset: 'nitro-prerender'
  })
  await build(nitroRenderer)

  // Import renderer entry
  const serverEntrypoint = resolve(nitroRenderer.options.output.serverDir, 'index.mjs')
  const { localFetch } = await import(pathToFileURL(serverEntrypoint).href)

  async function renderRoute (route = '/', renderContext = {}) {
    // Fetch the route
    const res = await (localFetch(withBase(route, nitro.options.baseURL), {
      headers: {
        'nuxt-render-context': stringifyQuery(renderContext)
      }
    }) as ReturnType<typeof fetch>)

    const html = await res.text()

    if (!res.ok) { return { html, error: res.statusText } }

    return { html }
  }

  return {
    ...createNuxt2DevServer(nitroRenderer),
    renderRoute
  }
}

async function resolveHandlers (nuxt: Nuxt) {
  const handlers: NitroEventHandler[] = [...nuxt.options.serverHandlers || []]
  const devHandlers: NitroDevEventHandler[] = [...nuxt.options.devServerHandlers || []]

  for (let m of nuxt.options.serverMiddleware) {
    if (typeof m === 'string' || typeof m === 'function' /* legacy middleware */) { m = { handler: m } }
    const route = m.path || m.route || '/'
    const handler = m.handler || m.handle
    if (typeof handler !== 'string' || typeof route !== 'string') {
      devHandlers.push({ route, handler })
    } else {
      delete m.handler
      delete m.path
      handlers.push({
        ...m,
        route,
        handler: await resolvePath(handler)
      })
    }
  }

  return {
    handlers,
    devHandlers
  }
}

async function writeDocumentTemplate (nuxt: Nuxt) {
  // Compile html template
  const src = nuxt.options.appTemplatePath || resolve(nuxt.options.buildDir, 'views/app.template.html')
  const dst = resolve(nuxt.options.buildDir, 'views/document.template.mjs')
  const contents = nuxt.vfs[src] || await fsp.readFile(src, 'utf-8').catch(() => '')
  if (contents) {
    const compiled = 'export default ' +
      // eslint-disable-next-line no-template-curly-in-string
      `(params) => \`${contents.replace(/{{ (\w+) }}/g, '${params.$1}')}\``
    await fsp.mkdir(dirname(dst), { recursive: true })
    await fsp.writeFile(dst, compiled, 'utf8')
  }
}
