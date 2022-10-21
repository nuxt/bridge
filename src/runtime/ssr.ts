/* eslint-disable no-redeclare */
import type { H3Event } from 'h3'
import { NuxtAppCompat, useNuxtApp } from './app'

export function useRequestHeaders<K extends string = string> (include: K[]): Record<K, string>
export function useRequestHeaders (): Readonly<Record<string, string>>
export function useRequestHeaders (include?) {
  if (process.client) { return {} }
  const headers: Record<string, string> = useNuxtApp().ssrContext?.event.req.headers ?? {}
  if (!include) { return headers }
  return Object.fromEntries(include.filter(key => headers[key]).map(key => [key, headers[key]]))
}

export function useRequestEvent (nuxtApp: NuxtAppCompat = useNuxtApp()): H3Event {
  return nuxtApp.ssrContext?.event as H3Event
}
