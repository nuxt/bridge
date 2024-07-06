import { defineUntypedSchema } from 'untyped'

export default defineUntypedSchema({
  /**
   * `future` is for early opting-in to new features that will become default in a future
   * (possibly major) version of the framework.
   */
  future: {
    /**
     * Enable early access to future features or flags.
     *
     * It is currently not configurable but may be in future.
     * @type {3 | 4}
     */
    compatibilityVersion: 3
  },
  experimental: {
    defaults: {
      /**
       * Options that apply to `useAsyncData` (and also therefore `useFetch`)
       */
      useAsyncData: {
        /** @type {'undefined' | 'null'} */
        value: {
          async $resolve (val, get) {
            return val ?? ((await get('future') as Record<string, unknown>).compatibilityVersion === 4 ? 'undefined' : 'null')
          }
        },
        /** @type {'undefined' | 'null'} */
        errorValue: {
          async $resolve (val, get) {
            return val ?? ((await get('future') as Record<string, unknown>).compatibilityVersion === 4 ? 'undefined' : 'null')
          }
        }
      }
    }
  }
})
