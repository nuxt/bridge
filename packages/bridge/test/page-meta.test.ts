import { describe, expect, it } from 'vitest'
import { rollup } from 'rollup'
import { PageMetaPlugin as plugin } from '../src/page-meta/transform'
import { transform } from "@babel/core";
import { parse, compileScript } from '@vue/compiler-sfc'

const babelTransform = (code: string) => {
  const descriptor = parse({ source: code, filename: 'test.vue' })
  const script = compileScript(descriptor).content
  const result = transform(script, { presets: ['@nuxt/babel-preset-app'] })

  return result.code
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
      expect(await getResult(`
export default {
  __name: 'with-layout',
  setup: function setup(__props) {
    var message;
    definePageMeta({
      layout: 'custom'
    });

    var obj = {
      setup: {
        test: 'test'
      }
    }
      return {
        __sfc: true,
        message: message
      };
    }
};`)).toMatchInlineSnapshot(`
  "
  const __nuxt_page_meta = {
    layout: 'custom'
  }
  export default {
    ...__nuxt_page_meta,__name: 'with-layout',
    setup: function setup(__props) {
      var message;
      ;

      var obj = {
        setup: {
          test: 'test'
        }
      }
        return {
          __sfc: true,
          message: message
        };
      }
  };"
`)
    })

    it('script and script setup', async () => {
      expect(await getResult(`
  var __default__ = {
    name: 'RedirectPage'
  };
  export default /*#__PURE__*/_defineComponent(_objectSpread(_objectSpread({}, __default__), {}, {
    setup: function setup(__props) {
      definePageMeta({
        middleware: ['redirect']
      });
      return {
        __sfc: true
      };
    }
  }));`)).toMatchInlineSnapshot(`
    "
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
      expect(await getResult(`
import { defineComponent as _defineComponent } from "vue";
const _sfc_main = /* @__PURE__ */ _defineComponent({
  __name: "redirect",
  setup(__props) {
    definePageMeta({
      middleware: ["redirect"]
    });
    const obj = {
      setup: {
        test: "test"
      }
    }
    return { __sfc: true };
  }
});`)).toMatchInlineSnapshot(`
  "
  import { defineComponent as _defineComponent } from "vue";
  const __nuxt_page_meta = {
    middleware: ["redirect"]
  }
  const _sfc_main = /* @__PURE__ */ _defineComponent({
    ...__nuxt_page_meta,__name: "redirect",
    setup(__props) {
      ;
      const obj = {
        setup: {
          test: "test"
        }
      }
      return { __sfc: true };
    }
  });"
`)
    })

    it('vite and javascript', async () => {
      expect(await getResult(`
      const _sfc_main = {
        __name: 'with-layout',
        setup(__props) {
          let message
        
          definePageMeta({
            layout: 'custom'
          })

          const obj = {
            setup: {
              test: 'test'
            }
          }
        
          return { __sfc: true,message }
        }
      }`)).toMatchInlineSnapshot(`
        "
              const __nuxt_page_meta = {
          layout: 'custom'
        }
        const _sfc_main = {
                ...__nuxt_page_meta,__name: 'with-layout',
                setup(__props) {
                  let message
                
                  

                  const obj = {
                    setup: {
                      test: 'test'
                    }
                  }
                
                  return { __sfc: true,message }
                }
              }"
      `)
    })

    it('script and script setup', async () => {
      expect(await getResult(`
const __default__ = {
  name: "RedirectPage"
};
const _sfc_main = /* @__PURE__ */ _defineComponent({
  ...__default__,
  setup(__props) {
    definePageMeta({
      middleware: ["redirect"]
    })
    return { __sfc: true };
  }
});`)).toMatchInlineSnapshot(`
  "
  const __default__ = {
    name: "RedirectPage"
  };
  const __nuxt_page_meta = {
    middleware: ["redirect"]
  }
  const _sfc_main = /* @__PURE__ */ _defineComponent({
    ...__nuxt_page_meta,...__default__,
    setup(__props) {
      
      return { __sfc: true };
    }
  });"
`)
    })
  })
})
