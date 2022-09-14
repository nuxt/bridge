import { defineUnimportPreset, Preset } from 'unimport'

export const commonPresets: Preset[] = [
  // #head
  defineUnimportPreset({
    from: '#head',
    imports: [
      'useHead',
      'useMeta'
    ]
  }),
  // vue-demi (mocked)
  defineUnimportPreset({
    from: '#app',
    imports: [
      'isVue2',
      'isVue3'
    ]
  })
]

export const appPreset = defineUnimportPreset({
  from: '#app',
  imports: [
    'useLazyAsyncData',
    'refreshNuxtData',
    'defineNuxtComponent',
    'useNuxtApp',
    'defineNuxtPlugin',
    'useRuntimeConfig',
    'useState',
    'useLazyFetch',
    'useCookie',
    'useRequestHeaders',
    'useRequestEvent',
    'defineNuxtRouteMiddleware',
    'navigateTo',
    'abortNavigation',
    'addRouteMiddleware',
    'useNuxt2Meta'
  ]
})

export const vueKeys: Array<keyof typeof import('vue')> = [
  // Lifecycle
  'onActivated',
  'onBeforeMount',
  'onBeforeUnmount',
  'onBeforeUpdate',
  'onDeactivated',
  'onErrorCaptured',
  'onMounted',
  'onRenderTracked',
  'onRenderTriggered',
  'onServerPrefetch',
  'onUnmounted',
  'onUpdated',

  // Reactivity
  'computed',
  'customRef',
  'isProxy',
  'isReactive',
  'isReadonly',
  'isRef',
  'markRaw',
  'proxyRefs',
  'reactive',
  'readonly',
  'ref',
  'shallowReactive',
  'shallowReadonly',
  'shallowRef',
  'toRaw',
  'toRef',
  'toRefs',
  'triggerRef',
  'unref',
  'watch',
  'watchEffect',
  'isShallow',

  // effect
  'effectScope',
  'getCurrentScope',
  'onScopeDispose',

  // Component
  'defineComponent',
  // TODO: https://github.com/vuejs/vue/pull/12684
  'defineAsyncComponent' as any,
  'getCurrentInstance',
  'h',
  'inject',
  'nextTick',
  'provide',
  'useAttrs',
  'useCssModule',
  'useCssVars',
  'useSlots'
]

// vue
export const vuePreset = defineUnimportPreset({
  from: 'vue',
  imports: vueKeys
})

// vue-router
const vueRouterPreset = defineUnimportPreset({
  from: 'vue-router/composables',
  imports: [
    'useRoute',
    'onBeforeRouteLeave',
    'onBeforeRouteUpdate',
    'useLink',
    'useRouter'
  ]
})

export const defaultPresets = [
  ...commonPresets,
  appPreset,
  vueRouterPreset,
  vuePreset
]
