import type { H3Event } from 'h3'
import type { NuxtAppCompat } from '@nuxt/bridge-schema'
import { useNuxtApp } from './app'

export function useRequestHeaders<K extends string = string> (include: K[]): Record<K, string>
export function useRequestHeaders (): Readonly<Record<string, string>>
export function useRequestHeaders (include?) {
  if (process.client) { return {} }
  const headers: Record<string, string> = useNuxtApp().ssrContext?.event.node.req.headers ?? {}
  if (!include) { return headers }
  return Object.fromEntries(include.filter(key => headers[key]).map(key => [key, headers[key]]))
}

export function useRequestEvent (nuxtApp: NuxtAppCompat = useNuxtApp()): H3Event {
  return nuxtApp.ssrContext?.event as H3Event
}
