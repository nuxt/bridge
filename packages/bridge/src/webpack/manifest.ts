import { resolve } from 'pathe'
import fse from 'fs-extra'
import { normalizeWebpackManifest } from 'vue-bundle-renderer'
import { useNuxt } from '@nuxt/kit'
import { writeClientManifest } from '../vite/manifest'

export async function generateWebpackBuildManifest () {
  const nuxt = useNuxt()
  const rDist = (...args: string[]): string => resolve(nuxt.options.buildDir, 'dist', ...args)

  const webpackManifest = await fse.readJSON(rDist('server/client.manifest.json'))

  const manifest = normalizeWebpackManifest(webpackManifest)

  await nuxt.callHook('build:manifest', manifest)

  await writeClientManifest(manifest, nuxt.options.buildDir)
}
