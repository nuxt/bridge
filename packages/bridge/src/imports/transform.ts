import { pathToFileURL } from 'url'
import { createUnplugin } from 'unplugin'
import { parseQuery, parseURL } from 'ufo'
import { Unimport } from 'unimport'
import { ImportsOptions } from '@nuxt/schema'
import { normalize } from 'pathe'

const NODE_MODULES_RE = /[\\/]node_modules[\\/]/
const IMPORTS_RE = /(['"])#imports\1/

export const TransformPlugin = createUnplugin(({ ctx, options }: { ctx: Unimport, options: Partial<ImportsOptions> }) => {
  return {
    name: 'nuxt:imports-transform',
    enforce: 'post',
    transformInclude (id) {
      const { pathname, search } = parseURL(decodeURIComponent(pathToFileURL(id).href))
      const { type, macro } = parseQuery(search)

      // Included
      if (options.transform?.include?.some(pattern => pattern.test(id))) {
        return true
      }
      // Excluded
      if (options.transform?.exclude?.some(pattern => pattern.test(id))) {
        return false
      }

      // vue files
      if (
        pathname.endsWith('.vue') &&
        (type === 'template' || type === 'script' || macro || !search)
      ) {
        return true
      }

      // js files
      if (pathname.match(/\.((c|m)?j|t)sx?$/g)) {
        return true
      }
    },
    async transform (_code, id) {
      id = normalize(id)
      const isNodeModule = NODE_MODULES_RE.test(id) && !options.transform?.include?.some(pattern => pattern.test(id))
      // For modules in node_modules, we only transform `#imports` but not doing imports
      if (isNodeModule && !IMPORTS_RE.test(_code)) {
        return
      }
      const { code, s } = await ctx.injectImports(_code, id, { autoImport: options.autoImport && !isNodeModule })
      if (code === _code) {
        return
      }
      return {
        code,
        map: s.generateMap({ source: id, includeContent: true })
      }
    }
  }
})
