import { resolve } from 'pathe'
import createVuePlugin from '@vitejs/plugin-vue2'
import { logger } from '@nuxt/kit'
import fse from 'fs-extra'
import { debounce } from 'perfect-debounce'
import { joinURL, withoutLeadingSlash, withTrailingSlash } from 'ufo'
import vite from './stub-vite.cjs'
import { bundleRequest } from './dev-bundler'
import { isCSS } from './utils'
import { wpfs } from './utils/wpfs'
import { ViteBuildContext, ViteOptions } from './types'
import { jsxPlugin } from './plugins/jsx'
import { generateDevSSRManifest } from './manifest'

export async function buildServer (ctx: ViteBuildContext) {
  // Workaround to disable HMR
  const _env = process.env.NODE_ENV
  process.env.NODE_ENV = 'production'
  const vuePlugin = createVuePlugin(ctx.config.vue)
  process.env.NODE_ENV = _env

  const alias = {}
  for (const p of ctx.builder.plugins) {
    alias[p.name] = p.mode === 'client'
      ? `defaultexport:${resolve(ctx.nuxt.options.buildDir, 'empty.js')}`
      : `defaultexport:${p.src}`
  }

  const serverConfig: vite.InlineConfig = vite.mergeConfig(ctx.config, {
    base: ctx.nuxt.options.dev
      ? joinURL(ctx.nuxt.options.app.baseURL, ctx.nuxt.options.app.buildAssetsDir)
      : undefined,
    experimental: {
      renderBuiltUrl: (filename, { type, hostType }) => {
        if (hostType !== 'js') {
          // In CSS we only use relative paths until we craft a clever runtime CSS hack
          return { relative: true }
        }
        switch (type) {
          case 'public':
            return { runtime: `__publicAssetsURL(${JSON.stringify(filename)})` }
          case 'asset': {
            const relativeFilename = filename.replace(withTrailingSlash(withoutLeadingSlash(ctx.nuxt.options.app.buildAssetsDir)), '')
            return { runtime: `__buildAssetsURL(${JSON.stringify(relativeFilename)})` }
          }
        }
      }
    },
    define: {
      'process.server': true,
      'process.client': false,
      'process.static': false,
      'typeof window': '"undefined"',
      'typeof document': '"undefined"',
      'typeof navigator': '"undefined"',
      'typeof location': '"undefined"',
      'typeof XMLHttpRequest': '"undefined"'
    },
    cacheDir: resolve(ctx.nuxt.options.rootDir, 'node_modules/.cache/vite/server'),
    resolve: {
      alias
    },
    ssr: {
      external: [
        'axios',
        '#internal/nitro',
        '#internal/nitro/utils'
      ],
      noExternal: [
        // TODO: Use externality for production (rollup) build
        /\/esm\/.*\.js$/,
        /\.(es|esm|esm-browser|esm-bundler).js$/,
        '#app',
        /nitropack\/(dist|src)/,
        ...ctx.nuxt.options.build.transpile.filter(i => typeof i === 'string')
      ]
    },
    build: {
      outDir: resolve(ctx.nuxt.options.buildDir, 'dist/server'),
      ssr: ctx.nuxt.options.ssr ?? true,
      ssrManifest: true,
      rollupOptions: {
        external: ['#internal/nitro/utils', '#internal/nitro'],
        input: resolve(ctx.nuxt.options.buildDir, 'server.js'),
        output: {
          entryFileNames: 'server.mjs',
          chunkFileNames: 'chunks/[name].mjs',
          preferConst: true,
          format: 'module'
        },
        onwarn (warning, rollupWarn) {
          if (!['UNUSED_EXTERNAL_IMPORT'].includes(warning.code)) {
            rollupWarn(warning)
          }
        }
      }
    },
    server: {
      // https://github.com/vitest-dev/vitest/issues/229#issuecomment-1002685027
      preTransformRequests: false,
      hmr: false
    },
    plugins: [
      jsxPlugin(),
      vuePlugin
    ]
  } as ViteOptions)

  await ctx.nuxt.callHook('vite:extendConfig', serverConfig, { isClient: false, isServer: true })

  const onBuild = () => ctx.nuxt.callHook('build:resources', wpfs)

  // Production build
  if (!ctx.nuxt.options.dev) {
    const start = Date.now()
    logger.info('Building server...')
    await vite.build(serverConfig)
    await onBuild()
    logger.success(`Server built in ${Date.now() - start}ms`)
    return
  }

  if (!ctx.nuxt.options.ssr) {
    await onBuild()
    return
  }

  // Start development server
  const viteServer = await vite.createServer(serverConfig)
  ctx.ssrServer = viteServer

  await ctx.nuxt.callHook('vite:serverCreated', viteServer, { isClient: false, isServer: true })

  // Close server on exit
  ctx.nuxt.hook('close', () => viteServer.close())

  // Initialize plugins
  await viteServer.pluginContainer.buildStart({})

  // Generate manifest files
  await fse.writeFile(resolve(ctx.nuxt.options.buildDir, 'dist/server/ssr-manifest.json'), JSON.stringify({}, null, 2), 'utf-8')
  await generateDevSSRManifest(ctx)

  // Build and watch
  const _doBuild = async () => {
    const start = Date.now()
    const { code, ids } = await bundleRequest({ viteServer }, '/.nuxt/server.js')
    await fse.writeFile(resolve(ctx.nuxt.options.buildDir, 'dist/server/server.mjs'), code, 'utf-8')
    // Have CSS in the manifest to prevent FOUC on dev SSR
    await generateDevSSRManifest(ctx, ids.filter(isCSS).map(i => '../' + i.slice(1)))
    const time = (Date.now() - start)
    logger.info(`Vite server built in ${time}ms`)
    await onBuild()
  }
  const doBuild = debounce(_doBuild)

  // Initial build
  await _doBuild()

  // Watch
  viteServer.watcher.on('all', (_event, file) => {
    if (file.indexOf(ctx.nuxt.options.buildDir) === 0) { return }
    doBuild()
  })
}
