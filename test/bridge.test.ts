import { fileURLToPath } from 'url'
import { describe, expect, it } from 'vitest'
import { setup, $fetch, fetch, startServer } from '@nuxt/test-utils'
import { expectNoClientErrors } from './utils'

const isWebpack = process.env.TEST_WITH_WEBPACK

await setup({
  rootDir: fileURLToPath(new URL('../playground', import.meta.url)),
  server: true,
  dev: !!process.env.NUXT_TEST_DEV,
  nuxtConfig: {
    // @ts-expect-error No types yet.
    bridge: { vite: !isWebpack },
    buildDir: process.env.NITRO_BUILD_DIR,
    nitro: { output: { dir: process.env.NITRO_OUTPUT_DIR } }
  }
})

describe('layers', () => {
  it('should have meta from layer', async () => {
    const html = await $fetch('/layer/composables')
    expect(html).toContain('layer activated')
  })
  // check composables
  it('should have composables autoimported', async () => {
    const html = await $fetch('/layer/composables')
    expect(html).toContain('layered composable activated!')
  })
})

describe('pages', () => {
  it('render hello world', async () => {
    const html = await $fetch('/')
    expect(html).toContain('Hello Vue 2!')
    expect(html).toContain('public:{myValue:123}')
    await expectNoClientErrors('/')
  })
  it('uses server Vue build', async () => {
    expect(await $fetch('/')).toContain('Rendered on server: true')
  })
})

describe('navigate', () => {
  it('should redirect to index with navigateTo', async () => {
    const { headers } = await fetch('/navigate-to/', { redirect: 'manual' })
    expect(headers.get('location')).toEqual('/navigation-target')
    await expectNoClientErrors('/navigate-to/')
  })
  it('should redirect to index with navigateTo and 301 code', async () => {
    const res = await fetch('/navigate-to/', { redirect: 'manual' })
    expect(res.status).toBe(301)
    await expectNoClientErrors('/navigate-to/')
  })
})

describe('navigate external', () => {
  it('should redirect to example.com', async () => {
    const { headers } = await fetch('/navigate-to-external/', { redirect: 'manual' })

    expect(headers.get('location')).toEqual('https://example.com/')
  })
})

describe('legacy capi', () => {
  it('should continue to work', async () => {
    const html = await $fetch('/legacy-capi')
    expect(html).toMatch(/([\s\S]*✅){11}/)
    await expectNoClientErrors('/legacy-capi')
  })
})

describe('errors', () => {
  it('should render a JSON error page', async () => {
    const res = await fetch('/error', {
      headers: {
        accept: 'application/json'
      }
    })
    expect(res.status).toBe(422)
    const error = await res.json()
    delete error.stack
    expect(error).toMatchObject({
      message: 'This is a custom error',
      statusCode: 422,
      statusMessage: 'This is a custom error',
      url: '/error'
    })
  })

  it('should render a HTML error page', async () => {
    const res = await fetch('/error')
    expect(await res.text()).toContain('This is a custom error')
    await expectNoClientErrors('/error')
  })
})

describe('route rules', () => {
  it('should enable spa mode', async () => {
    expect(await $fetch('/route-rules/spa')).toContain('serverRendered:false')
  })
})

describe('dynamic paths', () => {
  if (process.env.NUXT_TEST_DEV) {
    // TODO:
    it.todo('dynamic paths in dev')
    return
  }
  if (process.env.TEST_WITH_WEBPACK) {
    // TODO:
    it.todo('work with webpack')
    return
  }
  it('should work with no overrides', async () => {
    const html = await $fetch('/assets')
    for (const match of html.matchAll(/(href|src)="(.*?)"/g)) {
      const url = match[2]
      expect(url.startsWith('/_nuxt/') || url === '/public.svg').toBeTruthy()
    }
    await expectNoClientErrors('/assets')
  })

  // Vite legacy build does not emit CSS files
  it.skipIf(!process.env.TEST_WITH_WEBPACK)('adds relative paths to CSS', async () => {
    const html = await $fetch('/assets')
    const urls = Array.from(html.matchAll(/(href|src)="(.*?)"/g)).map(m => m[2])
    const cssURL = urls.find(u => /_nuxt\/assets.*\.css$/.test(u))
    const css = await $fetch(cssURL)
    const imageUrls = Array.from(css.matchAll(/url\(['"]?([^')]*)['"]?\)/g)).map(m =>
      m[1].replace(/[-.][\w]{8}\./g, '.')
    )
    expect(imageUrls).toMatchInlineSnapshot(`
        [
          "./logo.svg",
          "../public.svg",
        ]
      `)
  })

  it('should allow setting base URL and build assets directory', async () => {
    process.env.NUXT_APP_BUILD_ASSETS_DIR = '/_other/'
    process.env.NUXT_APP_BASE_URL = '/foo/'
    await startServer()

    const html = await $fetch('/foo/assets')
    for (const match of html.matchAll(/(href|src)="(.*?)"/g)) {
      const url = match[2]
      expect(
        url.startsWith('/foo/_other/') ||
        url === '/foo/public.svg'
      ).toBeTruthy()
    }
    await expectNoClientErrors('/foo/assets')
  })

  it('should allow setting relative baseURL', async () => {
    delete process.env.NUXT_APP_BUILD_ASSETS_DIR
    process.env.NUXT_APP_BASE_URL = './'
    await startServer()

    const html = await $fetch('/assets')
    for (const match of html.matchAll(/(href|src)="(.*?)"/g)) {
      const url = match[2]
      expect(
        url.startsWith('./_nuxt/') ||
        url === './public.svg'
      ).toBeTruthy()
      expect(url.startsWith('./_nuxt/_nuxt')).toBeFalsy()
    }
  })

  it('should set runtime config', async () => {
    const html = await $fetch('/runtime-config')
    expect(html.match(/<pre>([\s\S]*)<\/pre>/)?.[0].replace(/&quot;/g, '"')).toMatchInlineSnapshot(`
      "<pre>{
        \\"app\\": {
          \\"baseURL\\": \\"./\\",
          \\"basePath\\": \\"/\\",
          \\"assetsPath\\": \\"/_nuxt/\\",
          \\"cdnURL\\": \\"\\",
          \\"head\\": {
            \\"title\\": \\"Nuxt Bridge Playground\\",
            \\"meta\\": [
              {
                \\"hid\\": \\"layer\\",
                \\"name\\": \\"layer\\",
                \\"content\\": \\"layer activated\\"
              }
            ]
          },
          \\"buildAssetsDir\\": \\"/_nuxt/\\"
        },
        \\"nitro\\": {
          \\"envPrefix\\": \\"NUXT_\\",
          \\"routeRules\\": {
            \\"/route-rules/spa\\": {
              \\"ssr\\": false
            }
          }
        },
        \\"public\\": {
          \\"myValue\\": 123
        },
        \\"secretKey\\": \\"nuxt\\"
      }</pre>"
    `)
    await expectNoClientErrors('/runtime-config')
  })

  it('should use baseURL when redirecting', async () => {
    process.env.NUXT_APP_BUILD_ASSETS_DIR = '/_other/'
    process.env.NUXT_APP_BASE_URL = '/foo/'
    await startServer()
    const { headers } = await fetch('/foo/navigate-to/', { redirect: 'manual' })

    expect(headers.get('location')).toEqual('/foo/navigation-target')
  })

  it('should allow setting CDN URL', async () => {
    process.env.NUXT_APP_BASE_URL = '/foo/'
    process.env.NUXT_APP_CDN_URL = 'https://example.com/'
    process.env.NUXT_APP_BUILD_ASSETS_DIR = '/_cdn/'
    await startServer()

    const html = await $fetch('/foo/assets')
    for (const match of html.matchAll(/(href|src)="(.*?)"/g)) {
      const url = match[2]
      expect(
        url.startsWith('https://example.com/_cdn/') ||
        url === 'https://example.com/public.svg'
      ).toBeTruthy()
    }
    await expectNoClientErrors('/foo/assets')
  })
})
