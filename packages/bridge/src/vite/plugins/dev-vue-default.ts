import type { Plugin } from 'vite'
import MagicString from 'magic-string'

const DEFAULT_VUE_IMPORT = 'vue_exports.default'
const NAMED_VUE_IMPORT = 'vue_exports.Vue'
const NAMED_VUE_EXPORT = '\n\nexport { Vue }\n'

const VUE_RUNTIME_PATHS = [
  'vue/dist/vue.runtime.esm.js',
  'vue/dist/vue.runtime.mjs'
]

export function devVueDefaultPlugin () {
  return <Plugin>{
    name: 'nuxt:dev-vue-default',
    apply: 'serve',
    enforce: 'pre',
    transform (src, id) {
      if (src.includes(DEFAULT_VUE_IMPORT)) {
        const s = new MagicString(src)
        s.replaceAll(DEFAULT_VUE_IMPORT, NAMED_VUE_IMPORT)
        return {
          code: s.toString(),
          map: s.generateMap({ source: id, includeContent: true })
        }
      }
      if (
        VUE_RUNTIME_PATHS.some(path => id.includes(path))
      ) {
        const s = new MagicString(src)
        s.append(NAMED_VUE_EXPORT)
        return {
          code: s.toString(),
          map: s.generateMap({ source: id, includeContent: true })
        }
      }
      return null
    }
  }
}
