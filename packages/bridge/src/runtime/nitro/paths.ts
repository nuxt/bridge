import { joinURL } from 'ufo'
// @ts-ignore
import { useRuntimeConfig } from '#internal/nitro'

export function baseURL (): string {
  return useRuntimeConfig().app.baseURL
}

export function buildAssetsDir (): string {
  return useRuntimeConfig().app.buildAssetsDir
}

export function buildAssetsURL (...path: string[]): string {
  return joinURL(publicAssetsURL(), useRuntimeConfig().app.buildAssetsDir, ...path)
}

export function publicAssetsURL (...path: string[]): string {
  const publicBase = useRuntimeConfig().app.cdnURL || useRuntimeConfig().app.baseURL
  return path.length ? joinURL(publicBase, ...path) : publicBase
}

globalThis.__publicAssetsURL = publicAssetsURL
globalThis.__buildAssetsURL = buildAssetsURL
