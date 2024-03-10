import { Script, createContext } from 'node:vm'
import { getBrowser, url, useTestContext } from '@nuxt/test-utils/e2e'
import { expect } from 'vitest'
import { parse } from 'devalue'
import { reactive, ref, shallowReactive, shallowRef } from 'vue'
import { createError } from 'h3'

export async function renderPage (path = '/') {
  const ctx = useTestContext()
  if (!ctx.options.browser) {
    throw new Error('`renderPage` require `options.browser` to be set')
  }

  const browser = await getBrowser()
  const page = await browser.newPage({})
  const pageErrors: Error[] = []
  const requests: string[] = []
  const consoleLogs: { type: string, text: string }[] = []

  page.on('console', (message) => {
    consoleLogs.push({
      type: message.type(),
      text: message.text()
    })
  })
  page.on('pageerror', (err) => {
    pageErrors.push(err)
  })
  page.on('request', (req) => {
    try {
      requests.push(req.url().replace(url('/'), '/'))
    } catch (err) {
    }
  })

  if (path) {
    await page.goto(url(path), { waitUntil: 'load' })
  }

  return {
    page,
    pageErrors,
    requests,
    consoleLogs
  }
}

export async function expectNoClientErrors (path: string) {
  const ctx = useTestContext()
  if (!ctx.options.browser) {
    return
  }

  const { page, pageErrors, consoleLogs } = await renderPage(path)

  const consoleLogErrors = consoleLogs.filter(i => i.type === 'error')
  const consoleLogWarnings = consoleLogs.filter(i => i.type === 'warning')

  expect(pageErrors).toEqual([])
  expect(consoleLogErrors).toEqual([])
  expect(consoleLogWarnings).toEqual([])

  await page.close()
}

const revivers = {
  NuxtError: (data: any) => createError(data),
  EmptyShallowRef: (data: any) => shallowRef(JSON.parse(data)),
  EmptyRef: (data: any) => ref(JSON.parse(data)),
  ShallowRef: (data: any) => shallowRef(data),
  ShallowReactive: (data: any) => shallowReactive(data),
  Island: (key: any) => key,
  Ref: (data: any) => ref(data),
  Reactive: (data: any) => reactive(data),
  // test fixture reviver only
  BlinkingText: () => '<revivified-blink>'
}
export const isRenderingJson = process.env.TEST_PAYLOAD !== 'js'

export function parsePayload (payload: string) {
  return parse(payload || '', revivers)
}
export function parseData (html: string) {
  const { script } = html.match(/<script>(?<script>window.__NUXT__.*?)<\/script>/)?.groups || {}
  const _script = new Script(script)
  return {
    script: _script.runInContext(createContext({ window: {} })),
    attrs: {}
  }
}
