import type { H3Event } from 'h3'
import type { NuxtAppCompat } from '@nuxt/bridge-schema'
import { getRequestHeaders } from 'h3'
import { useNuxtApp } from '../nuxt'

export function useRequestHeaders<K extends string = string> (include: K[]): { [key in Lowercase<K>]?: string }
export function useRequestHeaders (): Readonly<Record<string, string>>
export function useRequestHeaders (include?: any[]) {
  if (process.client) { return {} }
  const event = useRequestEvent()
  const headers = event ? getRequestHeaders(event) : {}
  if (!include) { return headers }
  return Object.fromEntries(include.map(key => key.toLowerCase()).filter(key => headers[key]).map(key => [key, headers[key]]))
}

export function useRequestEvent (nuxtApp: NuxtAppCompat = useNuxtApp()): H3Event {
  return nuxtApp.ssrContext?.event as H3Event
}
