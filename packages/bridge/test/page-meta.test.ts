import { describe, expect, it } from 'vitest'
import { rollup } from 'rollup'
import { PageMetaPlugin as plugin } from '../src/page-meta/transform'
import { transform } from "@babel/core";
import { parse, compileScript, rewriteDefault } from '@vue/compiler-sfc'

const babelTransform = (code: string) => {
  const descriptor = parse({ source: code, filename: 'test.vue' })
  const script = compileScript(descriptor).content
  const result = transform(script, { presets: ['@nuxt/babel-preset-app'] })

  return result.code
}

const viteTransform = (code: string) => {
  const descriptor = parse({ source: code, filename: 'test.vue' })
  const script = compileScript(descriptor).content

  // https://github.com/vitejs/vite-plugin-vue2/blob/main/src/main.ts#L251-L254
  return rewriteDefault(script, '_sfc_main')
}

const getResult = (code: string) => new Promise<string>((resolve) => {
  const input = '/some/file.vue?type=script'
  rollup({
    input,
    plugins: [
      {
        name: 'virtual',
        resolveId: id => id === input ? input : { id, external: true },
        load: () => code
      },
      plugin.vite({ sourcemap: false }),
      {
        name: 'resolve',
        transform: {
          order: 'post',
          handler: (code) => {
            resolve(code)
            // suppress any errors from rollup itself
            return 'export default 42'
          }
        }
      }
    ]
  })
})

describe('page-meta', () => {
  describe('webpack', () => {
    it('typescript', async () => {
      const input = `<script setup lang="ts">
const route = useRoute()
definePageMeta({
  middleware: ['redirect'],
  layout: 'custom'
})
const obj = {
  setup: {
    test: 'test'
  }
}
</script>
`
      expect(await getResult(babelTransform(input))).toMatchInlineSnapshot(`
        "import { defineComponent as _defineComponent } from 'vue';
        const __nuxt_page_meta = {
          middleware: ['redirect'],layout: 'custom'
        }
        export default /*#__PURE__*/_defineComponent({
          ...__nuxt_page_meta,__name: 'test',
          setup: function setup(__props) {
            var route = useRoute();
            ;
            var obj = {
              setup: {
                test: 'test'
              }
            };
            return {
              __sfc: true,
              route: route,
              obj: obj
            };
          }
        });"
      `)
    })

    it('javascript', async () => {
      const input = `<script setup>
const route = useRoute()
definePageMeta({
  middleware: ['redirect'],
  layout: 'custom'
})
const obj = {
  setup: {
    test: 'test'
  }
}
</script>
`
      expect(await getResult(babelTransform(input))).toMatchInlineSnapshot(`
        "const __nuxt_page_meta = {
          middleware: ['redirect'],layout: 'custom'
        }
        export default {
          ...__nuxt_page_meta,__name: 'test',
          setup: function setup(__props) {
            var route = useRoute();
            ;
            var obj = {
              setup: {
                test: 'test'
              }
            };
            return {
              __sfc: true,
              route: route,
              obj: obj
            };
          }
        };"
      `)
    })

    it('script and script setup', async () => {
      const input = `<script setup lang="ts">
definePageMeta({
  middleware: ['redirect'],
})
</script>
<script lang="ts">
export default {
  name: 'RedirectPage'
}
</script>
`
      expect(await getResult(babelTransform(input))).toMatchInlineSnapshot(`
        "import "core-js/modules/es6.object.keys.js";
        import "core-js/modules/es6.symbol.js";
        import "core-js/modules/es6.array.filter.js";
        import "core-js/modules/es6.object.get-own-property-descriptor.js";
        import "core-js/modules/es6.array.for-each.js";
        import "core-js/modules/es7.object.get-own-property-descriptors.js";
        import "core-js/modules/es6.object.define-properties.js";
        import "core-js/modules/es6.object.define-property.js";
        import _defineProperty from "@babel/runtime/helpers/esm/defineProperty";
        function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
        function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
        import { defineComponent as _defineComponent } from 'vue';
        var __default__ = {
          name: 'RedirectPage'
        };
        const __nuxt_page_meta = {
          middleware: ['redirect']
        }
        export default /*#__PURE__*/_defineComponent(_objectSpread(_objectSpread({}, __default__), {}, {
          ...__nuxt_page_meta,setup: function setup(__props) {
            ;
            return {
              __sfc: true
            };
          }
        }));"
      `)
    })
  })

  describe('vite', () => {
    it('vite and typescript', async () => {
      const input = `<script setup lang="ts">
const route = useRoute()
definePageMeta({
  middleware: ['redirect'],
  layout: 'custom'
})
const obj = {
  setup: {
    test: 'test'
  }
}
</script>
`
      expect(await getResult((viteTransform(input)))).toMatchInlineSnapshot(`
        "import { defineComponent as _defineComponent } from 'vue'

        const __nuxt_page_meta = {
          middleware: ['redirect'],layout: 'custom'
        }
        const _sfc_main = /*#__PURE__*/_defineComponent({
          ...__nuxt_page_meta,__name: 'test',
          setup(__props) {

        const route = useRoute()

        const obj = {
          setup: {
            test: 'test'
          }
        }

        return { __sfc: true,route, obj }
        }

        })"
      `)
    })

    it('vite and javascript', async () => {
      const input = `<script setup>
const route = useRoute()
definePageMeta({
  middleware: ['redirect'],
  layout: 'custom'
})
const obj = {
  setup: {
    test: 'test'
  }
}
</script>
`
      expect(await getResult(viteTransform(input))).toMatchInlineSnapshot(`
        "const __nuxt_page_meta = {
          middleware: ['redirect'],layout: 'custom'
        }
        const _sfc_main = {
          ...__nuxt_page_meta,__name: 'test',
          setup(__props) {

        const route = useRoute()

        const obj = {
          setup: {
            test: 'test'
          }
        }

        return { __sfc: true,route, obj }
        }

        }"
      `)
    })

    it('script and script setup', async () => {
      const input = `<script setup lang="ts">
definePageMeta({
  middleware: ['redirect'],
})
</script>
<script lang="ts">
export default {
  name: 'RedirectPage'
}
</script>
`
      expect(await getResult(viteTransform(input))).toMatchInlineSnapshot(`
        "import { defineComponent as _defineComponent } from 'vue'

        const __default__ = {
          name: 'RedirectPage'
        }


        const __nuxt_page_meta = {
          middleware: ['redirect']
        }
        const _sfc_main = /*#__PURE__*/_defineComponent({
          ...__nuxt_page_meta,...__default__,
          setup(__props) {



        return { __sfc: true, }
        }

        })"
      `)
    })
  })
})
