import type { IncomingMessage, ServerResponse } from 'node:http'
import { join, resolve } from 'pathe'
import createVuePlugin from '@vitejs/plugin-vue2'
import { logger } from '@nuxt/kit'
import { joinURL, withoutLeadingSlash } from 'ufo'
import { getPort } from 'get-port-please'
import type { ServerOptions, InlineConfig } from 'vite'
import { defineEventHandler } from 'h3'
import defu from 'defu'
import { viteNodePlugin } from '../vite-node'
import { mergeConfig, createServer, build } from './stub-vite.cjs'
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

  const clientConfig: InlineConfig = await mergeConfig(ctx.config, {
    base: ctx.nuxt.options.dev
      ? joinURL(ctx.nuxt.options.app.baseURL.replace(/^\.\//, '/') || '/', ctx.nuxt.options.app.buildAssetsDir)
      : './',
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
      // use `process.client` instead. `process.browser` is deprecated
      'process.browser': true,
      'module.hot': false
    },
    cacheDir: resolve(ctx.nuxt.options.rootDir, 'node_modules/.cache/vite/client'),
    resolve: {
      alias,
      dedupe: ['vue']
    },
    build: {
      rollupOptions: {
        input: resolve(ctx.nuxt.options.buildDir, 'client.js')
      },
      manifest: 'manifest.json',
      outDir: resolve(ctx.nuxt.options.buildDir, 'dist/client')
    },
    plugins: [
      jsxPlugin(),
      createVuePlugin(ctx.config.vue),
      devStyleSSRPlugin({
        srcDir: ctx.nuxt.options.srcDir,
        buildAssetsURL: joinURL(ctx.nuxt.options.app.baseURL, ctx.nuxt.options.app.buildAssetsDir)
      }),
      viteNodePlugin(ctx)
    ],
    appType: 'custom',
    server: {
      middlewareMode: true
    }
  } as ViteOptions)

  const disabledLegacy = typeof ctx.nuxt.options.bridge.vite === 'object' && ctx.nuxt.options.bridge.vite.legacy === false

  if (!disabledLegacy) {
    const legacyPlugin = await import('@vitejs/plugin-legacy').then(r => r.default || r)
    // @ts-expect-error
    clientConfig.plugins.push(legacyPlugin())
  }

  // In build mode we explicitly override any vite options that vite is relying on
  // to detect whether to inject production or development code (such as HMR code)
  if (!ctx.nuxt.options.dev) {
    clientConfig.server.hmr = false
  }

  if (clientConfig.server && clientConfig.server.hmr !== false) {
    const hmrPortDefault = 24678 // Vite's default HMR port
    const hmrPort = await getPort({
      port: hmrPortDefault,
      ports: Array.from({ length: 20 }, (_, i) => hmrPortDefault + 1 + i)
    })
    clientConfig.server = defu(clientConfig.server, <ServerOptions> {
      https: ctx.nuxt.options.server.https,
      hmr: {
        protocol: ctx.nuxt.options.server.https ? 'wss' : 'ws',
        port: hmrPort
      }
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
    const viteServer = await createServer(clientConfig)
    ctx.clientServer = viteServer
    await ctx.nuxt.callHook('vite:serverCreated', viteServer, { isClient: true, isServer: false })

    const transformHandler = viteServer.middlewares.stack.findIndex(m => m.handle instanceof Function && m.handle.name === 'viteTransformMiddleware')
    viteServer.middlewares.stack.splice(transformHandler, 0, {
      route: '',
      handle: (req: IncomingMessage & { _skip_transform?: boolean }, res: ServerResponse, next: (err?: any) => void) => {
        // 'Skip' the transform middleware
        if (req._skip_transform) { req.url = joinURL('/__skip_vite', req.url!) }
        next()
      }
    })

    const viteMiddleware = defineEventHandler(async (event) => {
      // Workaround: vite devmiddleware modifies req.url
      const originalURL = event.node.req.url!

      const viteRoutes = viteServer.middlewares.stack.map(m => m.route).filter(r => r.length > 1)
      if (!originalURL.startsWith(clientConfig.base!) && !viteRoutes.some(route => originalURL.startsWith(route))) {
        // @ts-expect-error _skip_transform is a private property
        event.node.req._skip_transform = true
      }
      await new Promise((resolve, reject) => {
        viteServer.middlewares.handle(event.node.req, event.node.res, (err: Error) => {
          event.node.req.url = originalURL
          return err ? reject(err) : resolve(null)
        })
      })
    })
    await ctx.nuxt.callHook('server:devHandler', viteMiddleware)

    ctx.nuxt.hook('close', async () => {
      await viteServer.close()
    })
  } else {
    // Build
    const start = Date.now()
    await build(clientConfig)
    logger.info(`Client built in ${Date.now() - start}ms`)
  }

  await prepareManifests(ctx)
}
