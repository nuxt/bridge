import { createRenderer } from 'vue-bundle-renderer/runtime'
import type { SSRContext } from 'vue-bundle-renderer/runtime'
import { CompatibilityEvent, eventHandler, getQuery } from 'h3'
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
    bodyScriptsPrepend: string,
    bodyScripts: string
  }>
}

// @ts-ignore
const getClientManifest: () => Promise<Manifest> = () => import('#build/dist/server/client.manifest.mjs')
  .then(r => r.default || r)
  .then(r => typeof r === 'function' ? r() : r)

// @ts-ignore
const getServerEntry = () => import('#build/dist/server/server.mjs').then(r => r.default || r)

const getSSRRenderer = lazyCachedFunction(async () => {
  // Load client manifest
  const manifest = await getClientManifest()
  if (!manifest) { throw new Error('client.manifest is not available') }

  // Load server bundle
  const createSSRApp = await getServerEntry()
  if (!createSSRApp) { throw new Error('Server bundle is not available') }

  return createRenderer(createSSRApp, {
    manifest,
    renderToString,
    buildAssetsURL
  })
})

// -- SPA Renderer --
const getSPARenderer = lazyCachedFunction(async () => {
  const manifest = await getClientManifest()

  const options = {
    manifest,
    renderToString: () => '<div id="__nuxt"></div>',
    buildAssetsURL
  }
  // Create SPA renderer and cache the result for all requests
  const renderer = createRenderer(() => () => {}, options)
  const result = await renderer.renderToString({})

  const renderToString = (ssrContext: NuxtSSRContext) => {
    const config = useRuntimeConfig()
    ssrContext.nuxt = {
      serverRendered: false,
      config: {
        public: config.public,
        app: config.app
      }
    }
    ssrContext.renderMeta = ssrContext.renderMeta ?? (() => Promise.resolve({}))
    return Promise.resolve(result)
  }

  return { renderToString }
})

export default eventHandler(async (event) => {
  // Whether we're rendering an error page
  const ssrError = event.req.url?.startsWith('/__nuxt_error') ? getQuery(event) : null
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

function lazyCachedFunction<T> (fn: () => Promise<T>): () => Promise<T> {
  let res: Promise<T> | null = null
  return () => {
    if (res === null) {
      res = fn().catch((err) => { res = null; throw err })
    }
    return res
  }
}
