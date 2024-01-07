import { fileURLToPath } from 'url'
import { describe, expect, it } from 'vitest'
import { setup, $fetch, fetch, startServer } from '@nuxt/test-utils'
import { expectNoClientErrors, parseData } from './utils'

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

describe('nuxt composables', () => {
  it('sets cookies correctly', async () => {
    const res = await fetch('/cookies', {
      headers: {
        cookie: Object.entries({
          'browser-accessed-but-not-used': 'provided-by-browser',
          'browser-accessed-with-default-value': 'provided-by-browser',
          'browser-set': 'provided-by-browser',
          'browser-set-to-null': 'provided-by-browser',
          'browser-set-to-null-with-default': 'provided-by-browser'
        }).map(([key, value]) => `${key}=${value}`).join('; ')
      }
    })
    const cookies = res.headers.get('set-cookie')
    expect(cookies).toMatchInlineSnapshot('"set-in-plugin=true; Path=/, set=set; Path=/, browser-set=set; Path=/, browser-set-to-null=; Max-Age=0; Path=/, browser-set-to-null-with-default=; Max-Age=0; Path=/"')
  })
  it('error should be render', async () => {
    const html = await $fetch('/async-data')

    expect(html).toContain('error2: Error: fetch-2 error')
    expect(html).toContain('error3: Error: fetch-3 error')
  })
})

describe('head tags', () => {
  it('SSR should render tags', async () => {
    const headHtml = await $fetch('/head')

    expect(headHtml).toContain('<title>Using a dynamic component - Nuxt Bridge Playground</title>')
    expect(headHtml).not.toContain('<meta name="description" content="first">')
    expect(headHtml).toContain('<meta charset="utf-16">')
    expect(headHtml.match('meta charset').length).toEqual(1)
    expect(headHtml).toContain('<meta name="viewport" content="width=1024, initial-scale=1">')
    expect(headHtml.match('meta name="viewport"').length).toEqual(1)
    expect(headHtml).not.toContain('<meta charset="utf-8">')
    expect(headHtml).toContain('<meta name="description" content="overriding with an inline useHead call">')
    expect(headHtml).toMatch(/<html[^>]*class="html-attrs-test"/)
    expect(headHtml).toMatch(/<body[^>]*class="body-attrs-test"/)
    expect(headHtml).toContain('<script src="https://a-body-appended-script.com"></script>')

    const indexHtml = await $fetch('/')
    // should render charset by default
    expect(indexHtml).toContain('<meta charset="utf-8">')
  })

  it('SSR script setup should render tags', async () => {
    const headHtml = await $fetch('/head-script-setup')

    // useHead - title & titleTemplate are working
    expect(headHtml).toContain('<title>head script setup - Nuxt Playground</title>')
    // useSeoMeta - template params
    expect(headHtml).toContain('<meta property="og:title" content="head script setup - Nuxt Playground">')
    // useSeoMeta - refs
    expect(headHtml).toContain('<meta name="description" content="head script setup description for Nuxt Playground">')
    // useServerHead - shorthands
    expect(headHtml).toContain('>/* Custom styles */</style>')
    // useHeadSafe - removes dangerous content
    expect(headHtml).toContain('<script id="xss-script"></script>')
    expect(headHtml).toContain('<meta content="0;javascript:alert(1)">')
  })

  it('should render http-equiv correctly', async () => {
    const html = await $fetch('/head')
    // http-equiv should be rendered kebab case
    expect(html).toContain('<meta content="default-src https" http-equiv="content-security-policy">')
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

describe('legacy async data', () => {
  it('should work with defineNuxtComponent', async () => {
    const html = await $fetch('/legacy/async-data')
    expect(html).toContain('<div>Hello API</div>')
    const { script } = parseData(html)
    expect(Object.values(script.data)).toMatchInlineSnapshot(`
      [
        {
          "hello": "Hello API",
        },
        {
          "fooParent": "fooParent",
        },
        {
          "fooChild": "fooChild",
        },
      ]
    `)
  })

  it('should work with defineNuxtComponent and setup', async () => {
    const html = await $fetch('/legacy/setup')
    expect(html).toContain('<div>Hello API</div>')
    const { script } = parseData(html)
    expect(Object.values(script._asyncData)).toMatchInlineSnapshot(`
      [
        {
          "hello": "Hello API",
        },
      ]
    `)
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

  it('should be changed store.state', async () => {
    const html = await $fetch('/legacy-capi')
    expect(html).toContain('<tr><td><b>useStore</b></td><td> ✅</td></tr>')
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

describe('middleware', () => {
  it('should navigate to auth', async () => {
    const html = await $fetch('/secret')

    expect(html).toContain('auth.vue')
    expect(html).not.toContain('navigate to auth')
  })

  it('should redirect to navigation-target', async () => {
    const html = await $fetch('/redirect/')

    expect(html).toContain('Navigated successfully')
  })

  it('should redirect to navigation-target', async () => {
    const html = await $fetch('/add-route-middleware')

    expect(html).toContain('Navigated successfully')
  })
})

describe('navigate', () => {
  it('should not overwrite headers', async () => {
    const { headers, status } = await fetch('/navigate-to-external', { redirect: 'manual' })

    expect(headers.get('location')).toEqual('/')
    expect(status).toEqual(302)
  })

  it('should allow aborting navigation on server-side', async () => {
    const res = await fetch('/redirect?abort', {
      headers: {
        accept: 'application/json'
      }
    })
    expect(res.status).toEqual(401)
  })

  it('respects redirects + headers in middleware', async () => {
    const res = await fetch('/navigate-some-path/', { redirect: 'manual', headers: { 'trailing-slash': 'true' } })
    expect(res.headers.get('location')).toEqual('/navigate-some-path')
    expect(res.status).toEqual(307)
    expect(await res.text()).toMatchInlineSnapshot('"<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=/navigate-some-path"></head></html>"')
  })

  it('supports directly aborting navigation on SSR', async () => {
    const { status } = await fetch('/navigate-to-false', { redirect: 'manual' })

    expect(status).toEqual(404)
  })
})

describe('store', () => {
  it('should be able to access $store in plugins', async () => {
    const html = await $fetch('/store')
    expect(html).toContain('state is: ✅')
  })
})

describe('layouts', () => {
  it('should apply custom layout', async () => {
    const html = await $fetch('/with-layout')

    expect(html).toContain('with-layout.vue')
    expect(html).toContain('Custom Layout:')
  })
})

describe('nitro plugins', () => {
  it('should prepend a node to the rendered template', async () => {
    const html = await $fetch('/nitro/template-plugin')
    expect(html).toMatch(/<body\s?>[\n\s]+<p>Prepended HTML<\/p>/)
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

  // webpack injects CSS differently
  it('adds relative paths to CSS', async () => {
    const html = await $fetch('/assets')
    const urls = Array.from(html.matchAll(/(href|src)="(.*?)"|url\(([^)]*?)\)/g)).map(m => m[2] || m[3])
    const cssURL = urls.find(u => /_nuxt\/assets.*\.css$/.test(u))
    expect(cssURL).toBeDefined()
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
        "app": {
          "baseURL": "./",
          "basePath": "/",
          "assetsPath": "/_nuxt/",
          "cdnURL": "",
          "head": {
            "meta": [
              {
                "name": "viewport",
                "content": "width=1024, initial-scale=1"
              },
              {
                "charset": "utf-8"
              },
              {
                "name": "description",
                "content": "Nuxt Fixture"
              }
            ]
          },
          "buildAssetsDir": "/_nuxt/"
        },
        "nitro": {
          "envPrefix": "NUXT_",
          "routeRules": {
            "/route-rules/spa": {
              "ssr": false
            }
          }
        },
        "public": {
          "myValue": 123
        },
        "secretKey": "nuxt"
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
