import { describe, expect, it } from 'vitest'
import { rollup } from 'rollup'
import { PageMetaPlugin as plugin } from '../src/page-meta/transform'

describe('page-meta', () => {
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

  describe('webpack', () => {
    it('typescript', async () => {
      expect(await getResult(`
      import { defineComponent as _defineComponent } from 'vue';
      export default /*#__PURE__*/_defineComponent({
        __name: 'redirect',
        setup: function setup(__props) {
          definePageMeta({
            middleware: ['redirect']
          });
          return {
            __sfc: true
          };
        }
      });`)).toMatchInlineSnapshot(`
        "
              import { defineComponent as _defineComponent } from 'vue';
              const __nuxt_page_meta = 
                            {
                    middleware: ['redirect']
                  }
                          export default /*#__PURE__*/_defineComponent({
                ...__nuxt_page_meta,__name: 'redirect',
                setup: function setup(__props) {
                  ;
                  return {
                    __sfc: true
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
          return {
            __sfc: true,
            message: message
          };
        }
      };
        `)).toMatchInlineSnapshot(`
          "
                const __nuxt_page_meta = 
                              {
                      layout: 'custom'
                    }
                            export default {
                  ...__nuxt_page_meta,__name: 'with-layout',
                  setup: function setup(__props) {
                    var message;
                    ;
                    return {
                      __sfc: true,
                      message: message
                    };
                  }
                };
                  "
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
              const __nuxt_page_meta = 
                            {
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
      return { __sfc: true };
    }
  });`)).toMatchInlineSnapshot(`
    "
          import { defineComponent as _defineComponent } from "vue";
      const __nuxt_page_meta = 
                        {
            middleware: ["redirect"]
          }
                      const _sfc_main = /* @__PURE__ */ _defineComponent({
        ...__nuxt_page_meta,__name: "redirect",
        setup(__props) {
          ;
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
        
          return { __sfc: true,message }
        }
      }`)).toMatchInlineSnapshot(`
        "
              const __nuxt_page_meta = 
                            {
                    layout: 'custom'
                  }
                          const _sfc_main = {
                ...__nuxt_page_meta,__name: 'with-layout',
                setup(__props) {
                  let message
                
                  
                
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
          });
          return { __sfc: true };
        }
      });`)).toMatchInlineSnapshot(`
        "
              const __default__ = {
                name: "RedirectPage"
              };
              const __nuxt_page_meta = 
                            {
                    middleware: ["redirect"]
                  }
                          const _sfc_main = /* @__PURE__ */ _defineComponent({
                ...__nuxt_page_meta,...__default__,
                setup(__props) {
                  ;
                  return { __sfc: true };
                }
              });"
      `)
    })
  })
})
