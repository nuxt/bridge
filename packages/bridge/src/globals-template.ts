import type { Nuxt } from '@nuxt/schema'
import { isFullStatic } from './utils'

export const globalsTemplate = {
  filename: 'composition-api/globals.mjs',
  getContents: ({ nuxt }: { nuxt: Nuxt }) => {
    const options = nuxt.options

    const globals = {
      // useFetch
      isFullStatic: isFullStatic(options)
    }

    const contents = Object.entries(globals)
      .map(([key, value]) => `export const ${key} = ${JSON.stringify(value)}`)
      .join('\n')

    return contents
  }
}
