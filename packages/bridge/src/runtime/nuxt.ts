import type { RuntimeConfig } from '@nuxt/schema'
import type { NuxtAppCompat } from '@nuxt/bridge-schema'
import { getCurrentInstance, reactive, onBeforeUnmount, watch, isRef } from 'vue'
import type { Ref } from 'vue'
import type { CombinedVueInstance } from 'vue/types/vue'
import type { MetaInfo } from 'vue-meta'
import { defu } from 'defu'

export interface Context {
  $_nuxtApp: NuxtAppCompat
}

type AugmentedComponent = CombinedVueInstance<Vue, object, object, object, Record<never, any>> & {
  _vueMeta?: boolean
  $metaInfo?: MetaInfo
}

type Reffed<T extends Record<string, any>> = {
  [P in keyof T]: T[P] extends Array<infer A> ? Ref<Array<Reffed<A>>> | Array<Reffed<A>> : T[P] extends Record<string, any> ? Reffed<T[P]> | Ref<Reffed<T[P]>> : T[P] | Ref<T[P]>
}

function unwrap (value: any): Record<string, any> {
  if (!value || typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') { return value }
  if (Array.isArray(value)) { return value.map(i => unwrap(i)) }
  if (isRef(value)) { return unwrap(value.value) }
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, value]) => [key, unwrap(value)]))
  }
  return value
}

/** internal */
function metaInfoFromOptions (metaOptions: Reffed<MetaInfo> | (() => Reffed<MetaInfo>)) {
  return metaOptions instanceof Function ? metaOptions : () => metaOptions
}

export const useNuxt2Meta = (metaOptions: Reffed<MetaInfo> | (() => Reffed<MetaInfo>)) => {
  let vm: AugmentedComponent | null = null
  try {
    vm = getCurrentInstance()!.proxy as AugmentedComponent
    const meta = vm.$meta()
    const $root = vm.$root

    if (!vm._vueMeta) {
      vm._vueMeta = true

      let parent = vm.$parent as AugmentedComponent
      while (parent && parent !== $root) {
        if (parent._vueMeta === undefined) {
          parent._vueMeta = false
        }
        parent = parent.$parent
      }
    }
    // @ts-ignore
    vm.$options.head = vm.$options.head || {}

    const unwatch = watch(metaInfoFromOptions(metaOptions), (metaInfo: MetaInfo) => {
      vm.$metaInfo = {
        ...vm.$metaInfo || {},
        ...unwrap(metaInfo)
      }
      if (process.client) {
        meta.refresh()
      }
    }, { immediate: true, deep: true })

    onBeforeUnmount(unwatch)
  } catch {
    const app = (useNuxtApp().nuxt2Context as any).app
    if (typeof app.head === 'function') {
      const originalHead = app.head
      app.head = function () {
        const head = originalHead.call(this) || {}
        return defu(unwrap(metaInfoFromOptions(metaOptions)()), head)
      }
    } else {
      app.head = defu(unwrap(metaInfoFromOptions(metaOptions)()), app.head)
    }
  }
}

let currentNuxtAppInstance: NuxtAppCompat | null

export const setNuxtAppInstance = (nuxt: NuxtAppCompat | null) => {
  currentNuxtAppInstance = nuxt
}

/**
 * Ensures that the setup function passed in has access to the Nuxt instance via `useNuxt`.
 * @param nuxt A Nuxt instance
 * @param setup The function to call
 */
export function callWithNuxt<T extends (...args: any[]) => any> (nuxt: NuxtAppCompat, setup: T, args?: Parameters<T>) {
  setNuxtAppInstance(nuxt)
  const p: ReturnType<T> = args ? setup(...args as Parameters<T>) : setup()
  if (process.server) {
    // Unset nuxt instance to prevent context-sharing in server-side
    setNuxtAppInstance(null)
  }
  return p
}

interface Plugin {
  (nuxt: NuxtAppCompat): Promise<void> | Promise<{ provide?: Record<string, any> }> | void | { provide?: Record<string, any> }
}

export function defineNuxtPlugin (plugin: Plugin): (ctx: Context, inject: (id: string, value: any) => void) => void {
  return async (ctx, inject) => {
    const result = await callWithNuxt(ctx.$_nuxtApp, plugin, [ctx.$_nuxtApp])
    if (result && result.provide) {
      for (const key in result.provide) {
        inject(key, result.provide[key])
      }
    }
    return result
  }
}

export const useNuxtApp = (): NuxtAppCompat => {
  const vm = getCurrentInstance()

  if (!vm) {
    if (!currentNuxtAppInstance) {
      throw new Error('nuxt app instance unavailable')
    }
    return currentNuxtAppInstance
  }

  // @ts-ignore
  return vm.proxy.$_nuxtApp
}

// Runtime config helper
export const useRuntimeConfig = () => {
  const nuxtApp = useNuxtApp()
  if (nuxtApp._config) {
    return nuxtApp._config as RuntimeConfig
  }

  nuxtApp._config = reactive(nuxtApp.$config)
  return nuxtApp._config as RuntimeConfig
}
