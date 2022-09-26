import { join, resolve } from 'pathe'
import createVuePlugin from '@vitejs/plugin-vue2'
import { logger } from '@nuxt/kit'
import { joinURL, withLeadingSlash, withoutLeadingSlash, withTrailingSlash } from 'ufo'
import escapeRE from 'escape-string-regexp'
import { getPort } from 'get-port-please'
import defu from 'defu'
import PluginLegacy from './stub-legacy.cjs'
import vite from './stub-vite.cjs'
import { devStyleSSRPlugin } from './plugins/dev-ssr-css'
import { jsxPlugin } from './plugins/jsx'
import { ViteBuildContext, ViteOptions } from './types'
import { prepareManifests } from './manifest'

export async function buildClient (ctx: ViteBuildContext) {
  const alias = {
    '#internal/nitro': resolve(ctx.nuxt.options.buildDir, 'nitro.client.mjs')
  }
  for (const p of ctx.builder.plugins) {
    alias[p.name] = p.mode === 'server'
      ? `defaultexport:${resolve(ctx.nuxt.options.buildDir, 'empty.js')}`
      : `defaultexport:${p.src}`
  }

  const clientConfig: vite.InlineConfig = vite.mergeConfig(ctx.config, {
    experimental: {
      renderBuiltUrl: (filename, { type, hostType }) => {
        if (hostType !== 'js' || type === 'asset') {
          // In CSS we only use relative paths until we craft a clever runtime CSS hack
          return { relative: true }
        }
        return { runtime: `globalThis.__publicAssetsURL(${JSON.stringify(filename)})` }
      }
    },
    define: {
      'process.client': true,
      'process.server': false,
      'process.static': false,
      'module.hot': false
    },
    cacheDir: resolve(ctx.nuxt.options.rootDir, 'node_modules/.cache/vite/client'),
    resolve: {
      alias
    },
    build: {
      rollupOptions: {
        input: resolve(ctx.nuxt.options.buildDir, 'client.js')
      },
      manifest: true,
      outDir: resolve(ctx.nuxt.options.buildDir, 'dist/client')
    },
    plugins: [
      jsxPlugin(),
      createVuePlugin(ctx.config.vue),
      PluginLegacy(),
      devStyleSSRPlugin({
        srcDir: ctx.nuxt.options.srcDir,
        buildAssetsURL: joinURL(ctx.nuxt.options.app.baseURL, ctx.nuxt.options.app.buildAssetsDir)
      })
    ],
    appType: 'custom',
    server: {
      middlewareMode: true
    }
  } as ViteOptions)

  // In build mode we explicitly override any vite options that vite is relying on
  // to detect whether to inject production or development code (such as HMR code)
  if (!ctx.nuxt.options.dev) {
    clientConfig.server.hmr = false
  }

  if (clientConfig.server.hmr !== false) {
    const hmrPortDefault = 24678 // Vite's default HMR port
    const hmrPort = await getPort({
      port: hmrPortDefault,
      ports: Array.from({ length: 20 }, (_, i) => hmrPortDefault + 1 + i)
    })
    clientConfig.server.hmr = defu(clientConfig.server.hmr as vite.HmrOptions, {
      // https://github.com/nuxt/framework/issues/4191
      protocol: 'ws',
      port: hmrPort
    })
  }

  // We want to respect users' own rollup output options
  ctx.config.build.rollupOptions = defu(ctx.config.build.rollupOptions, {
    output: {
      // https://github.com/vitejs/vite/tree/main/packages/vite/src/node/build.ts#L464-L478
      assetFileNames: ctx.nuxt.options.dev ? undefined : withoutLeadingSlash(join(ctx.nuxt.options.app.buildAssetsDir, '[name].[hash].[ext]')),
      chunkFileNames: ctx.nuxt.options.dev ? undefined : withoutLeadingSlash(join(ctx.nuxt.options.app.buildAssetsDir, '[name].[hash].js')),
      entryFileNames: ctx.nuxt.options.dev ? 'entry.js' : withoutLeadingSlash(join(ctx.nuxt.options.app.buildAssetsDir, '[name].[hash].js'))
    }
  })

  await ctx.nuxt.callHook('vite:extendConfig', clientConfig, { isClient: true, isServer: false })

  if (ctx.nuxt.options.dev) {
    // Dev
    const viteServer = await vite.createServer(clientConfig)
    ctx.clientServer = viteServer
    await ctx.nuxt.callHook('vite:serverCreated', viteServer, { isClient: true, isServer: false })
    const baseURL = joinURL(ctx.nuxt.options.app.baseURL.replace(/^\./, '') || '/', ctx.nuxt.options.app.buildAssetsDir)
    const BASE_RE = new RegExp(`^${escapeRE(withTrailingSlash(withLeadingSlash(baseURL)))}`)
    const viteMiddleware: vite.Connect.NextHandleFunction = (req, res, next) => {
      // Workaround: vite devmiddleware modifies req.url
      const originalURL = req.url
      req.url = req.url.replace(BASE_RE, '/')
      viteServer.middlewares.handle(req, res, (err) => {
        req.url = originalURL
        next(err)
      })
    }
    await ctx.nuxt.callHook('server:devMiddleware', viteMiddleware)

    ctx.nuxt.hook('close', async () => {
      await viteServer.close()
    })
  } else {
    // Build
    const start = Date.now()
    await vite.build(clientConfig)
    logger.info(`Client built in ${Date.now() - start}ms`)
  }

  await prepareManifests(ctx)
}
