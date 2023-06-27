import type { DefineComponent } from 'vue'
import { useHead } from '@unhead/vue'
import type { NuxtAppCompat } from '@nuxt/bridge-schema'
import { defineComponent, getCurrentInstance, useRoute, createError, toRefs, reactive } from './composables'
import { useAsyncData } from './asyncData'

export const isVue2 = true
export const isVue3 = false

async function runLegacyAsyncData (res: Record<string, any> | Promise<Record<string, any>>, fn: (nuxtApp: NuxtAppCompat) => Promise<Record<string, any>>) {
  const nuxtApp = useNuxtApp()
  const route = useRoute()
  const vm = getCurrentInstance()!
  // @ts-ignore type mismatch
  const { fetchKey, _fetchKeyBase } = vm.proxy!.$options
  // @ts-ignore type mismatch
  const key = (typeof fetchKey === 'function' ? fetchKey(() => '') : fetchKey) ||
  // TODO vm.type is not available in Vue 3
    ([_fetchKeyBase, route.fullPath, route.matched.findIndex(r => Object.values(r.components || {}).includes(vm.type))].join(':'))

  const { data, error } = await useAsyncData(`options:asyncdata:${key}`, () => callWithNuxt(nuxtApp, fn, [nuxtApp]))
  if (error.value) {
    throw createError(error.value)
  }
  if (data.value && typeof data.value === 'object') {
    Object.assign(await res, toRefs(reactive(data.value)))
  } else if (process.dev) {
    console.warn('[nuxt] asyncData should return an object', data)
  }
}

export const defineNuxtComponent: typeof defineComponent =
function defineNuxtComponent (...args: any[]): any {
  const [options, key] = args
  const { setup } = options

  // Avoid wrapping if no options api is used
  if (!setup && !options.asyncData && !options.head) {
    return {
      ...options
    }
  }

  return {
    _fetchKeyBase: key,
    ...options,
    setup (props, ctx) {
      const nuxtApp = useNuxtApp()
      const res = setup ? Promise.resolve(callWithNuxt(nuxtApp, () => setup(props, ctx))).then(r => r || {}) : {}

      const promises: Promise<any>[] = []
      if (options.asyncData) {
        promises.push(runLegacyAsyncData(res, options.asyncData))
      }

      if (options.head) {
        const nuxtApp = useNuxtApp()
        useHead(typeof options.head === 'function' ? () => options.head(nuxtApp) : options.head)
      }

      return Promise.resolve(res)
        .then(() => Promise.all(promises))
        .then(() => res)
        .finally(() => {
          promises.length = 0
        })
    }
  } as DefineComponent
}

export interface Context {
  $_nuxtApp: NuxtAppCompat
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

  return vm.proxy.$_nuxtApp
}
