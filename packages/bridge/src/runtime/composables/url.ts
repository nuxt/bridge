import { getRequestURL } from 'h3'
import { useRequestEvent } from './ssr'

export function useRequestURL (opts?: Parameters<typeof getRequestURL>[1]) {
  if (process.server) {
    return getRequestURL(useRequestEvent()!, opts)
  }
  return new URL(window.location.href)
}
