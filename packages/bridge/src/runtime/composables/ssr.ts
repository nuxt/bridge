import type { H3Event } from 'h3'
import type { NuxtAppCompat } from '@nuxt/bridge-schema'
import { getRequestHeaders, createEvent } from 'h3'
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

export function useRequestEvent (nuxtApp: NuxtAppCompat = useNuxtApp()): H3Event | undefined {
  if (process.client || !nuxtApp.ssrContext) {
    return undefined
  }
  // check if H3 event is available
  if (nuxtApp.ssrContext?.event) { return nuxtApp.ssrContext.event }
  // Check if we created H3 event manually before
  if (nuxtApp.ssrContext?._event) { return nuxtApp.ssrContext._event }
  // Create H3 event https://github.com/nuxt/bridge/pull/999#discussion_r1413049422
  nuxtApp.ssrContext._event = createEvent(nuxtApp.ssrContext?.req, nuxtApp.ssrContext?.res)
  return nuxtApp.ssrContext._event
}
