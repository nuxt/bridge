import { createServerHead } from '@unhead/vue'
import { renderSSRHead } from '@unhead/ssr'
import { createRenderer } from 'vue-bundle-renderer/runtime'
import type { SSRContext } from 'vue-bundle-renderer/runtime'
import { H3Event, getQuery } from 'h3'
import devalue from '@nuxt/devalue'
import type { RuntimeConfig } from '@nuxt/schema'
import type { NuxtAppCompat } from '@nuxt/bridge-schema'
import type { RenderResponse } from 'nitropack'
import { markRaw } from 'vue'
// @ts-ignore
import { useRuntimeConfig, defineRenderHandler, getRouteRules } from '#internal/nitro'
// @ts-ignore
import { useNitroApp } from '#internal/nitro/app'
// @ts-ignore
import { buildAssetsURL } from '#paths'
// @ts-ignore
import htmlTemplate from '#build/views/document.template.mjs'
// @ts-ignore
import { renderToString } from '#vue-renderer'
// @ts-ignore
import metaConfig from '#build/meta.config.mjs'

const STATIC_ASSETS_BASE = process.env.NUXT_STATIC_BASE + '/' + process.env.NUXT_STATIC_VERSION
const PAYLOAD_JS = '/payload.js'

export interface NuxtRenderHTMLContext {
  htmlAttrs: string[]
  head: string[]
  headAttrs: string[]
  bodyAttrs: string[]
  bodyPrepend: string[]
  body: string[]
  bodyAppend: string[]
}

export interface NuxtRenderResponse {
  body: string,
  statusCode: number,
  statusMessage?: string,
  headers: Record<string, string>
}

interface NuxtSSRContext extends SSRContext {
  url: string
  noSSR: boolean
  redirected?: boolean
  event: H3Event
  /** @deprecated use `ssrContext.event` instead */
  req: H3Event['req']
  /** @deprecated use `ssrContext.event` instead */
  res: H3Event['res']
  runtimeConfig: RuntimeConfig
  error?: any
  nuxt?: any
  payload?: any
  renderMeta?: () => Promise<any>
  nuxtApp?: NuxtAppCompat
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

export default defineRenderHandler(async (event) => {
  // Whether we're rendering an error page
  const ssrError = event.node.req.url?.startsWith('/__nuxt_error')
    ? getQuery(event)
    : null
  let url = ssrError?.url as string || event.node.req.url!

  // payload.json request detection
  let isPayloadReq = false
  if (url.startsWith(STATIC_ASSETS_BASE) && url.endsWith(PAYLOAD_JS)) {
    isPayloadReq = true
    url = url.slice(STATIC_ASSETS_BASE.length, url.length - PAYLOAD_JS.length) || '/'
  }

  // Get route options (currently to apply `ssr: false`)
  const routeOptions = getRouteRules(event)

  const head = createServerHead()
  head.push(markRaw(metaConfig.globalMeta))

  // Initialize ssr context
  const config = useRuntimeConfig()
  const ssrContext: NuxtSSRContext = {
    url,
    event,
    req: event.node.req,
    res: event.node.res,
    runtimeConfig: { private: config, public: { public: config.public, app: config.app } },
    noSSR: !!event.node.req.headers['x-nuxt-no-ssr'] || routeOptions.ssr === false,
    error: ssrError,
    redirected: undefined,
    nuxt: undefined as undefined | Record<string, any>, /* Nuxt 2 payload */
    payload: undefined,
    nuxtApp: undefined,
    head
  }

  // Render app
  const renderer = (process.env.NUXT_NO_SSR || ssrContext.noSSR) ? await getSPARenderer() : await getSSRRenderer()
  const _rendered = await renderer.renderToString(ssrContext).catch((err) => {
    if (!ssrError) {
      // Use explicitly thrown error in preference to subsequent rendering errors
      throw ssrContext.error || err
    }
  }) as RenderResult

  // If we error on rendering error page, we bail out and directly return to the error handler
  if (!_rendered) { return }

  if (ssrContext.redirected || event.node.res.writableEnded) {
    return
  }

  // Handle errors
  if (ssrContext.nuxt?.error && !ssrError) {
    throw ssrContext.nuxt.error
  }

  ssrContext.nuxtApp?.hooks.callHook('app:rendered', { ssrContext, renderResult: _rendered })

  ssrContext.nuxt = ssrContext.nuxt || {}

  if (process.env.NUXT_FULL_STATIC) {
    ssrContext.nuxt.staticAssetsBase = STATIC_ASSETS_BASE
  }

  if (isPayloadReq) {
    const response: RenderResponse = {
      body: renderPayload(ssrContext.nuxt, url),
      statusCode: ssrContext.event.node.res.statusCode,
      statusMessage: ssrContext.event.node.res.statusMessage,
      headers: {
        'content-type': 'text/javascript;charset=UTF-8',
        'x-powered-by': 'Nuxt'
      }
    }
    return response
  } else {
    const state = `<script>window.__NUXT__=${devalue(ssrContext.nuxt)}</script>`

    _rendered.meta = _rendered.meta || {}
    const meta = await renderSSRHead(head)

    Object.assign(_rendered.meta, {
      ...meta,
      bodyScriptsPrepend: meta.bodyTagsOpen,
      // resolves naming difference with NuxtMeta and Unhead
      bodyScripts: meta.bodyTags
    })

    // Create render context
    const htmlContext: NuxtRenderHTMLContext = {
      htmlAttrs: normalizeChunks([_rendered.meta.htmlAttrs]),
      headAttrs: normalizeChunks([_rendered.meta.headAttrs]),
      head: normalizeChunks([
        _rendered.meta.headTags,
        _rendered.renderResourceHints(),
        _rendered.renderStyles(),
        ssrContext.styles
      ]),
      bodyAttrs: normalizeChunks([_rendered.meta.bodyAttrs]),
      bodyPrepend: normalizeChunks([
        ssrContext.teleports?.body,
        _rendered.meta.bodyScriptsPrepend
      ]),
      body: [
        // TODO: Rename to _rendered.body in next vue-bundle-renderer
        _rendered.html
      ],
      bodyAppend: normalizeChunks([
        state,
        _rendered.renderScripts(),
        _rendered.meta.bodyScripts
      ])
    }

    // Allow hooking into the rendered result
    const nitroApp = useNitroApp()
    await nitroApp.hooks.callHook('render:html', htmlContext, { event })

    // Construct HTML response
    const response: RenderResponse = {
      body: htmlTemplate({
        HTML_ATTRS: joinAttrs(htmlContext.htmlAttrs),
        HEAD_ATTRS: joinAttrs(htmlContext.headAttrs),
        HEAD: joinTags(htmlContext.head),
        BODY_ATTRS: joinAttrs(htmlContext.bodyAttrs),
        APP: joinTags(htmlContext.bodyPrepend) + _rendered.html + joinTags(htmlContext.bodyAppend)
      }),
      statusCode: event.node.res.statusCode,
      statusMessage: event.node.res.statusMessage,
      headers: {
        'content-type': 'text/html;charset=UTF-8',
        'x-powered-by': 'Nuxt'
      }
    }

    return response
  }
})

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

function normalizeChunks (chunks: (string | undefined)[]) {
  return chunks.filter(Boolean).map(i => i!.trim())
}

function joinTags (tags: string[]) {
  return tags.join('')
}

function joinAttrs (chunks: string[]) {
  return chunks.join(' ')
}
