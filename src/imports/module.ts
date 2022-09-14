import { addVitePlugin, addWebpackPlugin, defineNuxtModule, addTemplate, resolveAlias, useNuxt, addPluginTemplate, logger } from '@nuxt/kit'
import { isAbsolute, join, relative, resolve, normalize } from 'pathe'
import { createUnimport, Import, toImports, Unimport } from 'unimport'
import { ImportsOptions, ImportPresetWithDeprecation } from '@nuxt/schema'
import { TransformPlugin } from './transform'
import { defaultPresets } from './presets'
import { scanForComposables } from './composables'

export default defineNuxtModule<Partial<ImportsOptions>>({
  meta: {
    name: 'imports',
    configKey: 'imports'
  },
  defaults: {
    presets: defaultPresets,
    global: false,
    imports: [],
    dirs: [],
    transform: {
      exclude: undefined
    }
  },
  async setup (options, nuxt) {
    // Deprecate hooks
    nuxt.hooks.deprecateHooks({
      'autoImports:sources': {
        to: 'imports:sources',
        message: '`autoImports:sources` hook is deprecated. Use `addImportsSources()` from `@nuxt/kit` or `imports:dirs` with latest Nuxt Bridge.'
      },
      'autoImports:dirs': {
        to: 'imports:dirs',
        message: '`autoImports:dirs` hook is deprecated. Use `addImportsDir()` from `@nuxt/kit` or `imports:dirs` with latest Nuxt Bridge.'
      },
      'autoImports:extend': {
        to: 'imports:extend',
        message: '`autoImports:extend` hook is deprecated. Use `addImports()` from `@nuxt/kit` or `imports:extend` with latest Nuxt Bridge.'
      }
    })

    // Allow modules extending sources
    await nuxt.callHook('imports:sources', options.presets as ImportPresetWithDeprecation[])

    options.presets.forEach((i: ImportPresetWithDeprecation) => {
      if (typeof i !== 'string' && i.names && !i.imports) {
        i.imports = i.names
        logger.warn('imports: presets.names is deprecated, use presets.imports instead')
      }
    })

    // Filter disabled sources
    // options.sources = options.sources.filter(source => source.disabled !== true)

    // Create a context to share state between module internals
    const ctx = createUnimport({
      presets: options.presets,
      imports: options.imports
    })

    // composables/ dirs from all layers
    let composablesDirs = []
    for (const layer of nuxt.options._layers) {
      composablesDirs.push(resolve(layer.config.srcDir, 'composables'))
      for (const dir of (layer.config.imports?.dirs ?? layer.config.autoImports?.dirs ?? [])) {
        composablesDirs.push(resolve(layer.config.srcDir, dir))
      }
    }

    await nuxt.callHook('imports:dirs', composablesDirs)
    composablesDirs = composablesDirs.map(dir => normalize(dir))

    // Support for importing from '#imports'
    addTemplate({
      filename: 'imports.mjs',
      getContents: () => ctx.toExports()
    })
    nuxt.options.alias['#imports'] = join(nuxt.options.buildDir, 'imports')

    // Transpile and injection
    // @ts-ignore temporary disabled due to #746
    if (nuxt.options.dev && options.global) {
      // Add all imports to globalThis in development mode
      addPluginTemplate({
        filename: 'imports.mjs',
        getContents: () => {
          const imports = ctx.getImports()
          const importStatement = toImports(imports)
          const globalThisSet = imports.map(i => `globalThis.${i.as} = ${i.as};`).join('\n')
          return `${importStatement}\n\n${globalThisSet}\n\nexport default () => {};`
        }
      })
    } else {
      // Transform to inject imports in production mode
      addVitePlugin(TransformPlugin.vite({ ctx, options }))
      addWebpackPlugin(TransformPlugin.webpack({ ctx, options }))
    }

    const regenerateImports = async () => {
      // Scan composables/
      await scanForComposables(composablesDirs, ctx)
      // Allow modules extending
      await ctx.modifyDynamicImports(async (imports) => {
        await nuxt.callHook('imports:extend', imports)
      })
    }

    await regenerateImports()

    // Generate types
    addDeclarationTemplates(ctx)

    // Add generated types to `nuxt.d.ts`
    nuxt.hook('prepare:types', ({ references }) => {
      references.push({ path: resolve(nuxt.options.buildDir, 'types/imports.d.ts') })
      references.push({ path: resolve(nuxt.options.buildDir, 'imports.d.ts') })
    })

    // Watch composables/ directory
    nuxt.hook('builder:watch', async (_, path) => {
      const _resolved = resolve(nuxt.options.srcDir, path)
      if (composablesDirs.find(dir => _resolved.startsWith(dir))) {
        await nuxt.callHook('builder:generateApp')
      }
    })

    nuxt.hook('builder:generateApp', async () => {
      await regenerateImports()
    })
  }
})

function addDeclarationTemplates (ctx: Unimport) {
  const nuxt = useNuxt()

  // Remove file extension for benefit of TypeScript
  const stripExtension = (path: string) => path.replace(/\.[a-z]+$/, '')

  const resolved = {}
  const r = ({ from }: Import) => {
    if (resolved[from]) {
      return resolved[from]
    }
    let path = resolveAlias(from)
    if (isAbsolute(path)) {
      path = relative(join(nuxt.options.buildDir, 'types'), path)
    }

    path = stripExtension(path)
    resolved[from] = path
    return path
  }

  addTemplate({
    filename: 'imports.d.ts',
    getContents: () => ctx.toExports()
  })

  addTemplate({
    filename: 'types/imports.d.ts',
    getContents: () => '// Generated by auto imports\n' + ctx.generateTypeDeclarations({ resolvePath: r })
  })
}
