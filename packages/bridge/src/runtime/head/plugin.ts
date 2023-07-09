import { VueHeadMixin } from '@unhead/vue'
import { defineNuxtPlugin } from '../app'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.mixin(VueHeadMixin)
})
