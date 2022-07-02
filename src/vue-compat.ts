import { pathToFileURL } from 'url'
import MagicString from 'magic-string'
import { findStaticImports } from 'mlly'
import { parseQuery, parseURL } from 'ufo'
import { createUnplugin } from 'unplugin'

export const VueCompat = createUnplugin((opts: { src?: string }) => {
  return {
    name: 'nuxt-legacy-vue-transform',
    enforce: 'post',
    transformInclude (id) {
      if (id.includes('vue2-bridge')) { return false }

      const { pathname, search } = parseURL(decodeURIComponent(pathToFileURL(id).href))
      const query = parseQuery(search)

      // vue files
      if (pathname.endsWith('.vue') && (query.type === 'script' || !search)) {
        return true
      }

      // js files
      if (pathname.match(/\.((c|m)?j|t)sx?/g)) {
        return true
      }
    },
    transform (code, id) {
      if (id.includes('vue2-bridge')) { return }

      const s = new MagicString(code)
      const imports = findStaticImports(code).filter(i => i.type === 'static' && vueAliases.includes(i.specifier))

      for (const i of imports) {
        s.overwrite(i.start, i.end, i.code.replace(`"${i.specifier}"`, `"${opts.src}"`).replace(`'${i.specifier}'`, `'${opts.src}'`))
      }

      if (s.hasChanged()) {
        return {
          code: s.toString(),
          map: s.generateMap({ source: id, includeContent: true })
        }
      }
    }
  }
})

const vueAliases = [
  // vue 3 helper packages
  '@vue/shared',
  '@vue/reactivity',
  '@vue/runtime-core',
  '@vue/runtime-dom',
  // vue-demi
  'vue-demi'
]
