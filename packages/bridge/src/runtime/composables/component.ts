
import { defineComponent } from 'vue'
import type { DefineComponent } from 'vue'
import { useHead } from '@unhead/vue'
import { useNuxtApp, callWithNuxt } from '../nuxt'

export const defineNuxtComponent: typeof defineComponent =
function defineNuxtComponent (...args: any[]): any {
  const [options, key] = args
  const { setup, head, ...opts } = options

  // Avoid wrapping if no options api is used
  if (!setup && !options.asyncData && !options.head) {
    return {
      ...options
    }
  }

  return {
    _fetchKeyBase: key,
    ...opts,
    setup (props, ctx) {
      const nuxtApp = useNuxtApp()
      const res = setup ? callWithNuxt(nuxtApp, setup, [props, ctx]) : {}

      if (options.head) {
        const nuxtApp = useNuxtApp()
        useHead(typeof options.head === 'function' ? () => options.head(nuxtApp) : options.head)
      }

      return res
    }
  } as DefineComponent
}
