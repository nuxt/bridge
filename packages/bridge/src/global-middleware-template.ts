
import type { NuxtTemplate } from '@nuxt/schema'
import { genArrayFromRaw, genImport, genSafeVariableName } from 'knitwork'
import { resolveFiles } from '@nuxt/kit'
import { getNameFromPath, hasSuffix } from './utils/names'

export const globalMiddlewareTemplate: NuxtTemplate = {
  filename: 'global-middleware.mjs',
  getContents: async ({ nuxt, app }) => {
    app.middleware = []
    const middlewareDir = nuxt.options.dir.middleware || 'middleware'
    const middlewareFiles = await resolveFiles(nuxt.options.srcDir, `${middlewareDir}/*{${nuxt.options.extensions.join(',')}}`)
    app.middleware.push(...middlewareFiles.map((file) => {
      const name = getNameFromPath(file)
      return { name, path: file, global: hasSuffix(file, '.global') }
    }))

    const globalMiddleware = app.middleware.filter(mw => mw.global)

    return [
      ...globalMiddleware.map(mw => genImport(mw.path, genSafeVariableName(mw.name))),
      `export const globalMiddleware = ${genArrayFromRaw(globalMiddleware.map(mw => genSafeVariableName(mw.name)))}`
    ].join('\n')
  }
}
