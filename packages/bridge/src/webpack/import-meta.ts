import { pathToFileURL } from 'node:url'
import { createUnplugin } from 'unplugin'
import { parseURL } from 'ufo'
import { normalize } from 'pathe'
import MagicString from 'magic-string'

const NODE_MODULES_RE = /[\\/]node_modules[\\/]/

// support for `import.meta` in webpack 4
export const ImportMetaPlugin = createUnplugin(() => {
  return {
    name: 'nuxt:import-meta-transform',
    enforce: 'post',
    transformInclude (id) {
      const { pathname } = parseURL(
        decodeURIComponent(pathToFileURL(id).href)
      )
      if (pathname.endsWith('.js') || pathname.endsWith('.vue')) {
        return true
      }
    },
    transform (code, id) {
      id = normalize(id)
      const isNodeModule = NODE_MODULES_RE.test(id)

      if (isNodeModule) {
        return
      }

      const s = new MagicString(code)
      s.replace(/import\.meta\.client/g, 'process.client')
        .replace(/import\.meta\.server/g, 'process.server')
        .replace(/import\.meta\.browser/g, 'process.browser')
        .replace(/import\.meta\.nitro/g, 'process.nitro')
        .replace(/import\.meta\.prerender/g, 'process.prerender')

      if (s.hasChanged()) {
        return {
          code: s.toString(),
          map: s.generateMap({ hires: true })
        }
      }
    }
  }
})
