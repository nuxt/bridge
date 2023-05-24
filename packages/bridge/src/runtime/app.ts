import type { Context as NuxtContext } from '@nuxt/types'
import type { Hookable } from 'hookable'
import type { ComponentOptions, VueConstructor } from 'vue'
import type { Route } from 'vue-router'
import { defineComponent, getCurrentInstance } from './composables'

export const isVue2 = true
export const isVue3 = false

export const defineNuxtComponent = defineComponent

export interface VueAppCompat {
  component: VueConstructor['component'],
  config: {
    globalProperties: any
    [key: string]: any
    errorHandler: VueConstructor['config']['errorHandler']
  },
  directive: VueConstructor['directive'],
  mixin: VueConstructor['mixin'],
  mount: () => void,
  provide: (name: string, value: any) => void,
  unmount: () => void,
  use: VueConstructor['use']
  version: string
}

export interface RuntimeNuxtHooks {
  'app:error': (err: any) => void | Promise<void>
  'app:error:cleared': (options: { redirect?: string }) => void | Promise<void>
  'app:mounted': (app: VueAppCompat) => void | Promise<void>
  'meta:register': (metaRenderers: any[]) => void | Promise<void>
  'vue:setup': () => void
}

export interface Nuxt2Context extends Omit<NuxtContext, 'from'> {
  from: Route;
}

export interface NuxtAppCompat {
  nuxt2Context: Nuxt2Context
  vue2App: ComponentOptions<Vue>

  vueApp: VueAppCompat

  globalName: string

  hooks: Hookable<RuntimeNuxtHooks>
  hook: NuxtAppCompat['hooks']['hook']
  callHook: NuxtAppCompat['hooks']['callHook']

  [key: string]: any

  ssrContext?: Record<string, any>
  payload: {
    [key: string]: any
  }

  provide: (name: string, value: any) => void
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
