
import { isAbsolute, relative } from 'pathe'
import type { Component, Nuxt, NuxtApp } from '@nuxt/schema'
import { genDynamicImport, genString } from 'knitwork'

import { resolveSchema, generateTypes } from 'untyped'

type ComponentsTemplateOptions = {
  buildDir: string
  components: Component[]
}

export const componentsTypeTemplate = {
  filename: 'components.d.ts',
  getContents: ({ options }: { options: ComponentsTemplateOptions }) => `// Generated by components discovery
declare module 'vue' {
  export interface GlobalComponents {
${options.components.map(c => `    '${c.pascalName}': typeof ${genDynamicImport(isAbsolute(c.filePath) ? relative(options.buildDir, c.filePath) : c.filePath, { wrapper: false })}['${c.export}']`).join(',\n')}
${options.components.map(c => `    'Lazy${c.pascalName}': typeof ${genDynamicImport(isAbsolute(c.filePath) ? relative(options.buildDir, c.filePath) : c.filePath, { wrapper: false })}['${c.export}']`).join(',\n')}
  }
}
${options.components.map(c => `export const ${c.pascalName}: typeof ${genDynamicImport(isAbsolute(c.filePath) ? relative(options.buildDir, c.filePath) : c.filePath, { wrapper: false })}['${c.export}']`).join('\n')}
${options.components.map(c => `export const Lazy${c.pascalName}: typeof ${genDynamicImport(isAbsolute(c.filePath) ? relative(options.buildDir, c.filePath) : c.filePath, { wrapper: false })}['${c.export}']`).join('\n')}
export const componentNames: string[]
`
}

interface TemplateContext {
  nuxt: Nuxt
  app: NuxtApp
}

const adHocModules = ['router', 'pages', 'auto-imports', 'meta', 'components']
export const schemaTemplate = {
  filename: 'types/schema.d.ts',
  getContents: ({ nuxt }: TemplateContext) => {
    const moduleInfo = nuxt.options._installedModules.map(m => ({
      ...m.meta || {},
      importName: m.entryPath || m.meta?.name
    })).filter(m => m.configKey && m.name && !adHocModules.includes(m.name))

    return [
      "import { NuxtModule } from '@nuxt/schema'",
      "declare module '@nuxt/schema' {",
      '  interface NuxtConfig {',
      ...moduleInfo.filter(Boolean).map(meta =>
      `    [${genString(meta.configKey)}]?: typeof ${genDynamicImport(meta.importName, { wrapper: false })}.default extends NuxtModule<infer O> ? Partial<O> : Record<string, any>`
      ),
      '  }',
      generateTypes(resolveSchema(nuxt.options.runtimeConfig),
        {
          interfaceName: 'RuntimeConfig',
          addExport: false,
          addDefaults: false,
          allowExtraKeys: false,
          indentation: 2
        }),
      '}'
    ].join('\n')
  }
}