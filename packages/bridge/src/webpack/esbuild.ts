import { EsbuildPlugin } from 'esbuild-loader'
import type { Configuration } from 'webpack'
import type { Nuxt } from '@nuxt/schema'

interface WebpackConfigContext {
  nuxt: Nuxt
  config: Configuration
  isServer: boolean
  transpile: RegExp[]
}

export function esbuild (ctx: WebpackConfigContext) {
  // https://esbuild.github.io/getting-started/#bundling-for-the-browser
  // https://gs.statcounter.com/browser-version-market-share
  // https://nodejs.org/en/
  const target = ctx.isServer ? 'es2020' : 'chrome85'

  // https://github.com/nuxt/nuxt/issues/13052
  ctx.config.optimization.minimizer = ctx.config.optimization.minimizer || []
  ctx.config.optimization.minimizer!.push(new EsbuildPlugin())

  ctx.config.module!.rules!.push(
    {
      test: /\.m?[jt]s$/i,
      loader: 'esbuild-loader',
      exclude: (file) => {
        // Not exclude files outside node_modules
        file = file.split('node_modules', 2)[1]
        if (!file) { return false }

        return !ctx.transpile.some((module) => {
          return module.test(file)
        })
      },

      options: {
        target,
        ...ctx.nuxt.options.build.loaders.esbuild,
        loader: 'ts',
        tsconfigRaw: '{}'
      }
    },
    {
      test: /\.m?[jt]sx$/,
      loader: 'esbuild-loader',
      options: {
        target,
        ...ctx.nuxt.options.build.loaders.esbuild,
        loader: 'tsx',
        jsxFactory: 'h',
        jsxFragment: 'Fragment',
        tsconfigRaw: '{}'
      }
    }
  )
}
