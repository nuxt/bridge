import { defineUntypedSchema } from 'untyped'

export default defineUntypedSchema({
  /**
   * Whether to use the vue-router integration in Nuxt 3/Nuxt 2 bridge. If you do not provide a value it will be
   * enabled if you have a `pages/` directory in your source folder.
   *
   * @type {boolean}
   */
  pages: undefined
})
