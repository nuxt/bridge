import Vue from 'vue'

// TODO: no longer exported
// createApp
// createRef
// defineAsyncComponent
// isRaw
// proxyRefs
// useCSSModule
// warn

export * from 'vue'

export const isFunction = fn => fn instanceof Function

export { Vue as default }

// mock for vue-demi
export const Vue2 = Vue
export const isVue2 = true
export const isVue3 = false
export const install = () => {}
