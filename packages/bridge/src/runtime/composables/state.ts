
import { reactive, toRef, isReactive, Ref, set } from 'vue'
import { useNuxtApp } from '../nuxt'

// payload.state is used for vuex by nuxt 2
export const useState = <T> (key: string, init?: (() => T)): Ref<T> => {
  const nuxtApp = useNuxtApp()
  if (!nuxtApp.payload.useState) {
    nuxtApp.payload.useState = {}
  }
  if (!isReactive(nuxtApp.payload.useState)) {
    nuxtApp.payload.useState = reactive(nuxtApp.payload.useState)
  }

  // see @vuejs/composition-api reactivity tracking on a reactive object with set
  if (!(key in nuxtApp.payload.useState)) {
    set(nuxtApp.payload.useState, key, undefined)
  }

  const state = toRef(nuxtApp.payload.useState, key)
  if (state.value === undefined && init) {
    state.value = init()
  }
  return state
}
