import { createRequire } from 'module'
import { extendWebpackConfig, useNuxt } from '@nuxt/kit'
import { transpile } from './vite/utils/transpile'
import { esbuild } from './webpack/esbuild'

const extensions = ['ts', 'tsx', 'cts', 'mts']
const typescriptRE = /\.[cm]?tsx?$/

type SetupTypescriptOptions = {
  isTSX: boolean;
  esbuild: boolean
}

export function setupTypescript (options: SetupTypescriptOptions) {
  const nuxt = useNuxt()

  nuxt.options.extensions.push(...extensions)
  nuxt.options.build.additionalExtensions.push(...extensions)

  nuxt.options.build.babel.plugins = nuxt.options.build.babel.plugins || []

  // Error if `@nuxt/typescript-build` is added
  const modules = [...nuxt.options.buildModules, nuxt.options.modules]
  if (modules.includes('@nuxt/typescript-build')) {
    throw new Error('Please remove `@nuxt/typescript-build` from `buildModules` and `modules`, or set `bridge.typescript: false` to avoid conflict with bridge.')
  }

  const _require = createRequire(import.meta.url)
  nuxt.options.build.babel.plugins.unshift(
    _require.resolve('@babel/plugin-proposal-optional-chaining'),
    _require.resolve('@babel/plugin-proposal-nullish-coalescing-operator')
  )

  if (!options.esbuild) {
    nuxt.options.build.babel.plugins.unshift(
      [_require.resolve('@babel/plugin-transform-typescript'), { isTSX: options.isTSX }]
    )
  }

  extendWebpackConfig((config) => {
    config.resolve.extensions!.push(...extensions.map(e => `.${e}`))
    const babelRule: any = config.module.rules.find((rule: any) => rule.test?.test('test.js'))
    config.module.rules.unshift({
      ...babelRule,
      test: typescriptRE
    })

    if (options.esbuild) {
      esbuild({ isServer: nuxt.options.ssr, nuxt, config, transpile: transpile({ isDev: nuxt.options.dev }) })
    }
  })
}
