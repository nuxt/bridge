import { createRenderer } from 'vue-bundle-renderer'
import type { SSRContext } from 'vue-bundle-renderer'
import { CompatibilityEvent, eventHandler, useQuery } from 'h3'
import devalue from '@nuxt/devalue'
import { RuntimeConfig } from '@nuxt/schema'
// @ts-ignore
import { useRuntimeConfig } from '#internal/nitro'
// @ts-ignore
import { buildAssetsURL } from '#paths'
// @ts-ignore
import htmlTemplate from '#build/views/document.template.mjs'
// @ts-ignore
import { renderToString } from '#vue-renderer'

const STATIC_ASSETS_BASE = process.env.NUXT_STATIC_BASE + '/' + process.env.NUXT_STATIC_VERSION
const PAYLOAD_JS = '/payload.js'

interface NuxtSSRContext extends SSRContext {
  url: string
  noSSR: boolean
  redirected?: boolean
  event: CompatibilityEvent
  req: CompatibilityEvent['req']
  res: CompatibilityEvent['res']
  runtimeConfig: RuntimeConfig
  error?: any
  nuxt?: any
  payload?: any
  renderMeta?: () => Promise<any>
}

interface RenderResult {
  html: any
  renderResourceHints: () => string
  renderStyles: () => string
  renderScripts: () => string
  meta?: Partial<{
    htmlAttrs?: string,
    bodyAttrs: string,
    headAttrs: string,
    headTags: string,
    bodyScriptsPrepend : string,
    bodyScripts : string
  }>
}

// @ts-ignore
const getClientManifest = () => import('#build/dist/server/client.manifest.mjs').then(r => r.default || r)

// @ts-ignore
const getServerEntry = () => process.env.NUXT_NO_SSR ? Promise.resolve(null) : import('#build/dist/server/server.mjs').then(r => r.default || r)

const getSSRRenderer = lazyCachedFunction(async () => {
  // Load client manifest
  const clientManifest = await getClientManifest()
  if (!clientManifest) { throw new Error('client.manifest is not available') }

  // Load server bundle
  const createSSRApp = await getServerEntry()
  if (!createSSRApp) { throw new Error('Server bundle is not available') }

  return createRenderer(createSSRApp, {
    clientManifest,
    renderToString,
    publicPath: buildAssetsURL()
  })
})

// -- SPA Renderer --
const getSPARenderer = lazyCachedFunction(async () => {
  const clientManifest = await getClientManifest()
  const renderToString = (ssrContext: NuxtSSRContext) => {
    const config = useRuntimeConfig()
    ssrContext.nuxt = {
      serverRendered: false,
      config: {
        public: config.public,
        app: config.app
      }
    }

    let entryFiles = Object.values(clientManifest).filter((fileValue: any) => fileValue.isEntry)
    if ('all' in clientManifest && 'initial' in clientManifest) {
      // Upgrade legacy manifest (also see normalizeClientManifest in vue-bundle-renderer)
      // https://github.com/nuxt-contrib/vue-bundle-renderer/issues/12
      entryFiles = clientManifest.initial.map(file => ({ file }))
    }

    return Promise.resolve({
      html: '<div id="__nuxt"></div>',
      renderResourceHints: () => '',
      renderStyles: () =>
        entryFiles
          .flatMap(({ css }) => css)
          .filter(css => css != null)
          .map(file => `<link rel="stylesheet" href="${buildAssetsURL(file)}">`)
          .join(''),
      renderScripts: () =>
        entryFiles
          .map(({ file }) => {
            const isMJS = !file.endsWith('.js')
            return `<script ${isMJS ? 'type="module"' : ''} src="${buildAssetsURL(file)}"></script>`
          })
          .join('')
    })
  }

  return { renderToString }
})

export default eventHandler(async (event) => {
  // Whether we're rendering an error page
  const ssrError = event.req.url?.startsWith('/__nuxt_error') ? useQuery(event) : null
  let url = ssrError?.url as string || event.req.url!

  // payload.json request detection
  let isPayloadReq = false
  if (url.startsWith(STATIC_ASSETS_BASE) && url.endsWith(PAYLOAD_JS)) {
    isPayloadReq = true
    url = url.slice(STATIC_ASSETS_BASE.length, url.length - PAYLOAD_JS.length) || '/'
  }

  // Initialize ssr context
  const config = useRuntimeConfig()
  const ssrContext: NuxtSSRContext = {
    url,
    event,
    req: event.req,
    res: event.res,
    runtimeConfig: { private: config, public: { public: config.public, app: config.app } },
    noSSR: !!event.req.headers['x-nuxt-no-ssr'],
    error: ssrError,
    redirected: undefined,
    nuxt: undefined as undefined | Record<string, any>, /* NuxtApp */
    payload: undefined
  }

  // Render app
  const renderer = (process.env.NUXT_NO_SSR || ssrContext.noSSR) ? await getSPARenderer() : await getSSRRenderer()
  const rendered = await renderer.renderToString(ssrContext).catch((e) => {
    if (!ssrError) { throw e }
  }) as RenderResult

  // If we error on rendering error page, we bail out and directly return to the error handler
  if (!rendered) { return }

  if (ssrContext.redirected || event.res.writableEnded) {
    return
  }

  // Handle errors
  if (ssrContext.nuxt?.error && !ssrError) {
    throw ssrContext.nuxt.error
  }

  if (ssrContext.nuxt?.hooks) {
    await ssrContext.nuxt.hooks.callHook('app:rendered')
  }

  ssrContext.nuxt = ssrContext.nuxt || {}

  if (process.env.NUXT_FULL_STATIC) {
    ssrContext.nuxt.staticAssetsBase = STATIC_ASSETS_BASE
  }

  if (isPayloadReq) {
    const data = renderPayload(ssrContext.nuxt, url)
    event.res.setHeader('Content-Type', 'text/javascript;charset=UTF-8')
    return data
  } else {
    const data = await renderHTML(ssrContext.nuxt, rendered, ssrContext)
    event.res.setHeader('Content-Type', 'text/html;charset=UTF-8')
    return data
  }
})

async function renderHTML (payload, rendered, ssrContext) {
  const state = `<script>window.__NUXT__=${devalue(payload)}</script>`

  rendered.meta = rendered.meta || {}
  if (ssrContext.renderMeta) {
    Object.assign(rendered.meta, await ssrContext.renderMeta())
  }

  return htmlTemplate({
    HTML_ATTRS: (rendered.meta.htmlAttrs || ''),
    HEAD_ATTRS: (rendered.meta.headAttrs || ''),
    HEAD: (rendered.meta.headTags || '') +
      rendered.renderResourceHints() + rendered.renderStyles() + (ssrContext.styles || ''),
    BODY_ATTRS: (rendered.meta.bodyAttrs || ''),
    BODY_PREPEND: (ssrContext.teleports?.body || ''),
    APP: (rendered.meta.bodyScriptsPrepend || '') + rendered.html + state + rendered.renderScripts() + (rendered.meta.bodyScripts || '')
  })
}

function renderPayload (payload, url) {
  return `__NUXT_JSONP__("${url}", ${devalue(payload)})`
}

function lazyCachedFunction <T> (fn: () => Promise<T>): () => Promise<T> {
  let res: Promise<T> | null = null
  return () => {
    if (res === null) {
      res = fn().catch((err) => { res = null; throw err })
    }
    return res
  }
}
