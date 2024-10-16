import { defineUnimportPreset, InlinePreset } from 'unimport'

export const commonPresets: InlinePreset[] = [
  // vue-demi (mocked)
  defineUnimportPreset({
    from: '#app/app',
    imports: [
      'isVue2',
      'isVue3'
    ]
  })
]

const granularAppPresets: InlinePreset[] = [
  {
    imports: ['setNuxtAppInstance', 'useNuxtApp', 'defineNuxtPlugin', 'useRuntimeConfig', 'useNuxt2Meta'],
    from: '#app/nuxt'
  },
  {
    imports: ['defineNuxtComponent'],
    from: '#app/composables/component'
  },
  {
    imports: ['useRoute', 'useRouter', 'abortNavigation', 'addRouteMiddleware', 'defineNuxtRouteMiddleware', 'navigateTo'],
    from: '#app/composables/router'
  },
  {
    imports: ['useState'],
    from: '#app/composables/state'
  },
  {
    imports: ['useLazyAsyncData', 'useNuxtData', 'refreshNuxtData', 'clearNuxtData'],
    from: '#app/composables/asyncData'
  },
  {
    imports: ['clearError', 'createError', 'isNuxtError', 'showError', 'useError', 'throwError'],
    from: '#app/composables/error'
  },
  {
    imports: ['useLazyFetch'],
    from: '#app/composables/fetch'
  },
  {
    imports: ['useCookie'],
    from: '#app/composables/cookie'
  },
  {
    imports: ['useRequestHeaders', 'useRequestEvent'],
    from: '#app/composables/ssr'
  },
  {
    imports: ['useRequestURL'],
    from: '#app/composables/url'
  },
  {
    imports: ['useAsyncData', 'useFetch', 'useHydration'],
    from: '#app/mocks'
  }
]

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
    'onBeforeRouteLeave',
    'onBeforeRouteUpdate',
    'useLink'
  ]
})

export const defaultPresets = [
  ...commonPresets,
  ...granularAppPresets,
  vueRouterPreset,
  vuePreset
]
