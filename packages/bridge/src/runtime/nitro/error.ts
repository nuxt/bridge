import { joinURL, withQuery } from 'ufo'
import type { NitroErrorHandler } from 'nitropack'
import { getRequestHeaders, setResponseHeader, setResponseStatus } from 'h3'
import type { H3Error } from 'h3'
// @ts-ignore TODO
import { useNitroApp, useRuntimeConfig } from '#internal/nitro'
// @ts-ignore
import { normalizeError, isJsonRequest } from '#internal/nitro/utils'

export default <NitroErrorHandler> async function errorhandler (_error: H3Error, event) {
  // Parse and normalize error
  const { stack, statusCode, statusMessage, message } = normalizeError(_error)

  // Create an error object
  const errorObject = {
    url: event.node.req.url,
    statusCode,
    statusMessage,
    message,
    stack: process.env.NODE_ENV === 'development' && statusCode !== 404
      ? `<pre>${stack.map(i => `<span class="stack${i.internal ? ' internal' : ''}">${i.text}</span>`).join('\n')}</pre>`
      : '',
    data: (_error as any).data
  }

  // Set response code and message
  setResponseStatus(event, (errorObject.statusCode !== 200 && errorObject.statusCode) as any as number || 500, errorObject.statusMessage)

  // Console output
  if (_error.unhandled || _error.fatal) {
    const tags = [
      '[nuxt]',
      '[request error]',
      _error.unhandled && '[unhandled]',
      _error.fatal && '[fatal]',
      Number(errorObject.statusCode) !== 200 && `[${errorObject.statusCode}]`
    ].filter(Boolean).join(' ')
    console.error(tags, errorObject.message + '\n' + stack.map(l => '  ' + l.text).join('  \n'))
  }

  // JSON response
  if (isJsonRequest(event)) {
    event.node.res.setHeader('Content-Type', 'application/json')
    event.node.res.end(JSON.stringify(errorObject))
    return
  }

  // HTML response (via SSR)
  const isErrorPage = event.node.req.url?.startsWith('/__nuxt_error')
  const res = !isErrorPage
    ? await useNitroApp().localFetch(withQuery(joinURL(useRuntimeConfig().app.baseURL, '/__nuxt_error'), errorObject), {
      headers: getRequestHeaders(event) as Record<string, string>,
      redirect: 'manual'
    }).catch(() => null)
    : null

  // Fallback to static rendered error page
  if (!res) {
    const { template } = process.env.NODE_ENV === 'development'
      // @ts-expect-error TODO: add legacy type support for subpath imports
      ? await import('@nuxt/ui-templates/templates/error-dev.mjs')
      // @ts-expect-error TODO: add legacy type support for subpath imports
      : await import('@nuxt/ui-templates/templates/error-500.mjs')
    if (process.env.NODE_ENV === 'development') {
      // TODO: Support `message` in template
      (errorObject as any).description = errorObject.message
    }
    setResponseHeader(event, 'Content-Type', 'text/html;charset=UTF-8')
    event.node.res.end(template(errorObject))
    return
  }

  for (const [header, value] of res.headers.entries()) {
    setResponseHeader(event, header, value)
  }

  setResponseStatus(event, res.status && res.status !== 200 ? res.status : undefined, res.statusText)

  event.node.res.end(await res.text())
}
