import { resolve } from 'pathe'
import { isIgnored, logger } from '@nuxt/kit'
import { sanitizeFilePath } from 'mlly'
import { withoutLeadingSlash } from 'ufo'
import type { ViteDevServer } from 'vite'
import { distDir, pkgDir } from '../dirs'
import { mergeConfig } from './stub-vite.cjs'
import { warmupViteServer } from './utils/warmup'
import { buildClient } from './client'
import { buildServer } from './server'
import { defaultExportPlugin } from './plugins/default-export'
import { jsxPlugin } from './plugins/jsx'
import { replace } from './plugins/replace'
import { resolveCSSOptions } from './css'
import type { Nuxt, ViteBuildContext, ViteOptions } from './types'

async function bundle (nuxt: Nuxt, builder: any) {
  for (const p of builder.plugins) {
    p.src = nuxt.resolver.resolvePath(resolve(nuxt.options.buildDir, p.src))
  }
  const ctx: ViteBuildContext = {
    nuxt,
    builder,
    config: await mergeConfig(
      {
        // defaults from packages/schema/src/config/vite
        root: nuxt.options.srcDir,
        mode: nuxt.options.dev ? 'development' : 'production',
        logLevel: 'warn',
        publicDir: resolve(nuxt.options.rootDir, nuxt.options.srcDir, nuxt.options.dir.static),
        vue: {
          isProduction: !nuxt.options.dev,
          template: {
            compilerOptions: nuxt.options.vue.compilerOptions
          }
        },
        esbuild: {
          jsxFactory: 'h',
          jsxFragment: 'Fragment',
          tsconfigRaw: '{}'
        },
        clearScreen: false,
        define: {
          'process.dev': nuxt.options.dev,
          'process.static': nuxt.options.target === 'static',
          'process.env.NODE_ENV': JSON.stringify(nuxt.options.dev ? 'development' : 'production'),
          'process.mode': JSON.stringify(nuxt.options.dev ? 'development' : 'production'),
          'process.target': JSON.stringify(nuxt.options.target)
        },
        resolve: {
          extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue'],
          alias: {
            ...nuxt.options.alias,
            '#build': nuxt.options.buildDir,
            '.nuxt': nuxt.options.buildDir,
            '/entry.mjs': resolve(nuxt.options.buildDir, 'client.js'),
            'web-streams-polyfill/ponyfill/es2018': resolve(distDir, 'runtime/vite/mock/web-streams-polyfill.mjs'),
            'whatwg-url': resolve(distDir, 'runtime/vite/mock/whatwg-url.mjs'),
            // Cannot destructure property 'AbortController' of ..
            'abort-controller': resolve(distDir, 'runtime/vite/mock/abort-controller.mjs')
          }
        },
        optimizeDeps: {
          exclude: [
            'ufo',
            'date-fns',
            'nanoid',
            'vue'
            // TODO(Anthony): waiting for Vite's fix https://github.com/vitejs/vite/issues/5688
            // ...nuxt.options.build.transpile.filter(i => typeof i === 'string'),
            // 'vue-demi'
          ]
        },
        css: resolveCSSOptions(nuxt),
        build: {
          assetsDir: withoutLeadingSlash(nuxt.options.app.buildAssetsDir),
          emptyOutDir: false,
          rollupOptions: {
            output: { sanitizeFileName: sanitizeFilePath }
          }
        },
        plugins: [
          replace({
            __webpack_public_path__: 'globalThis.__webpack_public_path__'
          }),
          jsxPlugin(),
          defaultExportPlugin()
        ],
        server: {
          watch: {
            ignored: isIgnored
          },
          fs: {
            strict: true,
            allow: [
              pkgDir,
              nuxt.options.buildDir,
              nuxt.options.srcDir,
              nuxt.options.rootDir,
              ...nuxt.options.modulesDir
            ]
          }
        }
      } as ViteOptions,
      nuxt.options.vite
    )
  }

  // In build mode we explicitly override any vite options that vite is relying on
  // to detect whether to inject production or development code (such as HMR code)
  if (!nuxt.options.dev) {
    ctx.config.server!.watch = undefined
    ctx.config.build!.watch = undefined
  }

  await ctx.nuxt.callHook('vite:extend', ctx)

  if (nuxt.options.dev) {
    ctx.nuxt.hook('vite:serverCreated', (server: ViteDevServer) => {
      const start = Date.now()
      warmupViteServer(server, ['/.nuxt/entry.mjs']).then(() => {
        logger.info(`Vite warmed up in ${Date.now() - start}ms`)
      }).catch(logger.error)
    })
  }

  await buildClient(ctx)
  await buildServer(ctx)
}

export class ViteBuilder {
  builder: any
  nuxt: Nuxt

  constructor (builder: any) {
    this.builder = builder
    this.nuxt = builder.nuxt
  }

  build () {
    return bundle(this.nuxt, this.builder)
  }
}
