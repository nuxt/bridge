import { defineUnimportPreset, InlinePreset } from 'unimport'

export const commonPresets: InlinePreset[] = [
  // #head
  defineUnimportPreset({
    from: '#head',
    imports: [
      'useMeta'
    ]
  }),
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
    imports: ['setNuxtAppInstance', 'useNuxtApp', 'defineNuxtPlugin'],
    from: '#app/nuxt'
  },
  {
    imports: ['defineNuxtComponent'],
    from: '#app/composables/component'
  },
  {
    imports: ['useRuntimeConfig', 'useNuxt2Meta', 'useRoute', 'useRouter', 'useState', 'abortNavigation', 'addRouteMiddleware', 'defineNuxtRouteMiddleware', 'navigateTo'],
    from: '#app/composables'
  },
  {
    imports: ['useLazyAsyncData', 'refreshNuxtData'],
    from: '#app/composables/asyncData'
  },
  {
    imports: ['clearError', 'createError', 'isNuxtError', 'showError', 'useError', 'throwError'],
    from: '#app/error'
  },
  {
    imports: ['useLazyFetch'],
    from: '#app/fetch'
  },
  {
    imports: ['useCookie'],
    from: '#app/cookie'
  },
  {
    imports: ['useRequestHeaders', 'useRequestEvent'],
    from: '#app/ssr'
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
