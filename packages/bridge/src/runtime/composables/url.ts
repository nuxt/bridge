import { getRequestURL } from 'h3'
import { useRequestEvent } from './ssr'

export function useRequestURL () {
  if (process.server) {
    return getRequestURL(useRequestEvent()!)
  }
  return new URL(window.location.href)
}
