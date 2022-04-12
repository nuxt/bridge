import type { Plugin } from 'vite'
import fse from 'fs-extra'
import { findExports } from 'mlly'
import MagicString from 'magic-string'

const PREFIX = 'defaultexport:'
const hasPrefix = (id: string = '') => id.startsWith(PREFIX)
const removePrefix = (id: string = '') => hasPrefix(id) ? id.substr(PREFIX.length) : id

export function defaultExportPlugin () {
  return <Plugin>{
    name: 'nuxt:default-export',
    enforce: 'pre',
    resolveId (id, importer) {
      if (hasPrefix(id)) {
        return id
      }
      if (importer && hasPrefix(importer)) {
        return this.resolve(id, removePrefix(importer))
      }
      return null
    },

    async load (id) {
      if (!hasPrefix(id)) { return null }

      const code = await fse.readFile(removePrefix(id), 'utf8')
      const s = new MagicString(code)

      const exports = findExports(code)
      if (!exports.find(i => i.names.includes('default'))) {
        s.append('\n\n' + 'export default () => {}')
      }

      return {
        code: s.toString(),
        map: s.generateMap({ source: removePrefix(id), includeContent: true })
      }
    }
  }
}
