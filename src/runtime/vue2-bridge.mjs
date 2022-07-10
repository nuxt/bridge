import Vue from 'vue'
export * from 'vue'

export const isFunction = fn => fn instanceof Function

// @ts-ignore
const defaultVue = Vue.default || Vue

export { defaultVue as default }

// mock for vue-demi
export const Vue2 = defaultVue
export const isVue2 = true
export const isVue3 = false
export const install = () => {}
