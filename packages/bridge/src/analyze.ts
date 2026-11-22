import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'pathe'
import { useNuxt, writeTypes } from '@nuxt/kit'

export function setupAnalyze (options: { writeTypes: boolean }) {
  const nuxt = useNuxt()

  if (nuxt.options.dev || !nuxt.options.build.analyze) {
    return
  }

  // The Nuxt 2 builder empties `buildDir` before building, which removes `.nuxt/tsconfig.json`.
  // `nuxi build` restores it by calling `writeTypes`, but `nuxi analyze` does not.
  if (options.writeTypes) {
    nuxt.hook('modules:done', async () => {
      await writeTypes(nuxt)
    })
  }

  nuxt.hook('build:done', async () => {
    await mkdir(nuxt.options.analyzeDir, { recursive: true })
  })

  // `webpack-bundle-analyzer` ignores `filename`, so map it to `reportFilename` / `statsFilename`
  nuxt.hook('build:before', () => {
    const analyze = nuxt.options.build.analyze
    if (typeof analyze !== 'object' || !('filename' in analyze) || typeof analyze.filename !== 'string' || 'reportFilename' in analyze) {
      return
    }
    const reportFilename = analyze.filename.includes('{name}')
      ? analyze.filename.replace('{name}', 'client')
      : join(dirname(analyze.filename), 'client.html')

    Object.assign(analyze, {
      reportFilename,
      statsFilename: reportFilename.replace(/\.html$/, '.json')
    })
  })
}
