import { isAbsolute, relative, join, resolve } from 'pathe'
import type { Component, Nuxt, NuxtApp, NuxtTemplate, NuxtTypeTemplate } from '@nuxt/schema'
import { genDynamicImport, genString } from 'knitwork'
import { defu } from 'defu'

import { resolveSchema, generateTypes } from 'untyped'

import type { JSValue } from 'untyped'

type ComponentsTemplateOptions = {
  buildDir: string
  components: Component[]
}

interface TemplateContext {
  nuxt: Nuxt
  app: NuxtApp & { templateVars: Record<string, any> }
}

export const componentsTypeTemplate = {
  filename: 'types/components.d.ts',
  getContents: ({ options }: { options: ComponentsTemplateOptions }) => {
    const typesDir = join(options.buildDir, 'types')
    return `// Generated by components discovery
declare module 'vue' {
  export interface GlobalComponents {
${options.components.map(c => `    '${c.pascalName}': typeof ${genDynamicImport(isAbsolute(c.filePath) ? relative(typesDir, c.filePath) : c.filePath, { wrapper: false })}['${c.export}']`).join(',\n')}
${options.components.map(c => `    'Lazy${c.pascalName}': typeof ${genDynamicImport(isAbsolute(c.filePath) ? relative(typesDir, c.filePath) : c.filePath, { wrapper: false })}['${c.export}']`).join(',\n')}
  }
}
${options.components.map(c => `export const ${c.pascalName}: typeof ${genDynamicImport(isAbsolute(c.filePath) ? relative(typesDir, c.filePath) : c.filePath, { wrapper: false })}['${c.export}']`).join('\n')}
${options.components.map(c => `export const Lazy${c.pascalName}: typeof ${genDynamicImport(isAbsolute(c.filePath) ? relative(typesDir, c.filePath) : c.filePath, { wrapper: false })}['${c.export}']`).join('\n')}
export const componentNames: string[]
`
  }
}

export const middlewareTypeTemplate = {
  filename: 'types/middleware.d.ts',
  getContents: ({ app }: TemplateContext) => {
    const middleware = app.templateVars.middleware

    return [
      'import type { Nuxt2Context } from \'@nuxt/bridge-schema\'',
      'import type { ComponentOptions } from \'vue\'',
      `export type MiddlewareKey = ${middleware.map(mw => genString(mw.name)).join(' | ') || 'string'}`,
      'declare module \'vue/types/options\' {',
      '  export type Middleware = MiddlewareKey | ((ctx: Nuxt2Context, cb: Function) => Promise<void> | void)',
      '  interface ComponentOptions<V extends Vue> {',
      '    middleware?: Middleware | Middleware[]',
      '  }',
      '}'
    ].join('\n')
  }
}

const adHocModules = ['router', 'pages', 'auto-imports', 'meta', 'components']
export const schemaTemplate: NuxtTemplate<TemplateContext> = {
  filename: 'types/schema.d.ts',
  getContents: async ({ nuxt }) => {
    const moduleInfo = nuxt.options._installedModules.map(m => ({
      ...m.meta || {},
      importName: m.entryPath || m.meta?.name
    })).filter(m => m.configKey && m.name && !adHocModules.includes(m.name))

    const relativeRoot = relative(resolve(nuxt.options.buildDir, 'types'), nuxt.options.rootDir)
    const getImportName = (name: string) => (name.startsWith('.') ? './' + join(relativeRoot, name) : name).replace(/\.\w+$/, '')
    const modules = moduleInfo.map(meta => [genString(meta.configKey), getImportName(meta.importName)])

    // @ts-ignore
    const nitroEnabled = nuxt.options.bridge?.nitro !== false
    // For nitro-less build we mirror the runtime config generation to the schema
    // https://github.com/nuxt/nuxt/blob/5eb1b32f62a0ad92bfa6f37641489c35caa4b791/packages/vue-renderer/src/renderer.js#L300

    // @ts-ignore
    const runtimeConfigs = nitroEnabled
      ? {
          private: Object.fromEntries(Object.entries(nuxt.options.runtimeConfig).filter(([key]) => key !== 'public')),
          public: nuxt.options.runtimeConfig.public
        }

      : {
          // @ts-ignore
          private: defu(nuxt.options.privateRuntimeConfig, nuxt.options.publicRuntimeConfig),
          // @ts-ignore
          public: nuxt.options.publicRuntimeConfig
        }

    const generatedPrivateTypes = generateTypes(await resolveSchema(runtimeConfigs.private as Record<string, JSValue>),
      {
        interfaceName: 'RuntimeConfig',
        addExport: false,
        addDefaults: false,
        allowExtraKeys: false,
        indentation: 2
      })
    const generatedPublicTypes = generateTypes(await resolveSchema(runtimeConfigs.public as Record<string, JSValue>),
      {
        interfaceName: 'PublicRuntimeConfig',
        addExport: false,
        addDefaults: false,
        allowExtraKeys: false,
        indentation: 2
      })

    const vueTypesConfig = nitroEnabled
      ? ['declare module \'vue/types/vue\' {',
          generatedPrivateTypes,
          '  interface Vue {',
          '    $config: RuntimeConfig & { public: PublicRuntimeConfig }',
          '  }',
          '}'
        ].join('\n')
      : [
          'declare module \'vue/types/vue\' {',
          generatedPrivateTypes,
          generatedPublicTypes,
          '  interface Vue {',
          '    $config: Omit<RuntimeConfig, \'public\'>',
          '  }',
          '}'
        ].join('\n')

    const bridgeSchemaConfig = [
      'declare module \'@nuxt/bridge-schema\' {',
      '  interface NuxtApp {',
      '    $config: RuntimeConfig',
      '  }',
      '  interface NuxtAppCompat {',
      '    $config: RuntimeConfig',
      '  }',
      '  interface NuxtRuntimeConfig extends RuntimeConfig {}',
      '}'
    ].join('\n')

    return [
      "import { NuxtModule, RuntimeConfig } from '@nuxt/schema'",
      "declare module '@nuxt/schema' {",
      '  interface NuxtConfig {',
      ...modules.map(([configKey, importName]) =>
        `    [${configKey}]?: typeof ${genDynamicImport(importName, { wrapper: false })}.default extends NuxtModule<infer O> ? Partial<O> : Record<string, any>`
      ),
      modules.length > 0 ? `    modules?: (undefined | null | false | NuxtModule | string | [NuxtModule | string, Record<string, any>] | ${modules.map(([configKey, importName]) => `[${genString(importName)}, Exclude<NuxtConfig[${configKey}], boolean>]`).join(' | ')})[],` : '',
      '  }',
      generatedPrivateTypes,
      generatedPublicTypes,
      '}',
      vueTypesConfig,
      bridgeSchemaConfig
    ].join('\n')
  }
}

export const appDefaults: NuxtTypeTemplate = {
  filename: 'types/app-defaults.d.ts',
  getContents: (ctx) => {
    const isV4 = ctx.nuxt.options.future.compatibilityVersion === 4
    return `
declare module '#app/defaults' {
  type DefaultAsyncDataErrorValue = ${isV4 ? 'undefined' : 'null'}
  type DefaultAsyncDataValue = ${isV4 ? 'undefined' : 'null'}
  type DefaultErrorValue = ${isV4 ? 'undefined' : 'null'}
  type DedupeOption = ${isV4 ? '\'cancel\' | \'defer\'' : 'boolean | \'cancel\' | \'defer\''}
}`
  }
}
