import { useHead } from '@unhead/vue'

const headSymbol = 'usehead'

// original plugin https://github.com/unjs/unhead/blob/main/packages/vue/src/vue2/index.ts
export const UnheadPlugin = function (_Vue) {
  _Vue.mixin({
    created () {
      // The root instance provide cannot be get.
      if (this.$options.nuxt) {
        return
      }

      let source = false
      const head = this.$options.head
      if (head) {
        source = typeof head === 'function'
          ? () => head.call(this)
          : head
      }

      // @ts-expect-error vue 2
      source && useHead(source)
    },

    beforeCreate () {
      const options = this.$options
      if (options.$unhead) {
        const origProvide = options.provide
        options.provide = function () {
          let origProvideResult
          if (typeof origProvide === 'function') { origProvideResult = origProvide.call(this) } else { origProvideResult = origProvide || {} }

          return {
            ...origProvideResult,
            [headSymbol]: options.$unhead
          }
        }
      }
    }
  })
}
