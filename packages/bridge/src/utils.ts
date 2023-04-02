import { NuxtOptions } from '@nuxt/schema'

export function isFullStatic (options: NuxtOptions) {
  return (
    !options.dev &&
    !options._legacyGenerate &&
    options.target === 'static' &&
    options.render?.ssr
  )
}
