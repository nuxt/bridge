// @ts-check
import { Agent as HTTPSAgent } from 'node:https'
import { $fetch } from 'ofetch'

export const viteNodeOptions = JSON.parse(process.env.NUXT_VITE_NODE_OPTIONS || '{}')

/**
 * The dev server may use a self-signed certificate, so validation is relaxed for
 * loopback hosts only. Any other host must present a valid certificate.
 */
function isLoopback (baseURL) {
  try {
    const { hostname } = new URL(baseURL)
    return ['localhost', '127.0.0.1', '[::1]', '::1'].includes(hostname)
  } catch {
    return false
  }
}

export const viteNodeFetch = $fetch.create({
  baseURL: viteNodeOptions.baseURL,
  // @ts-expect-error https://github.com/node-fetch/node-fetch#custom-agent
  agent: viteNodeOptions.baseURL.startsWith('https://') && isLoopback(viteNodeOptions.baseURL)
    ? new HTTPSAgent({ rejectUnauthorized: false })
    : null
})
