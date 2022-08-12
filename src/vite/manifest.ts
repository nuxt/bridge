import { resolve } from 'pathe'
import fse from 'fs-extra'
import { Manifest as ViteManifest } from 'vite'
import { normalizeViteManifest, Manifest, ResourceMeta } from 'vue-bundle-renderer'
import { hash } from './utils'
import { ViteBuildContext } from './types'

const DEFAULT_APP_TEMPLATE = `
<!DOCTYPE html>
<html {{ HTML_ATTRS }}>
<head {{ HEAD_ATTRS }}>
  {{ HEAD }}
</head>
<body {{ BODY_ATTRS }}>
  {{ APP }}
</body>
</html>
`

export async function prepareManifests (ctx: ViteBuildContext) {
  const rDist = (...args: string[]): string => resolve(ctx.nuxt.options.buildDir, 'dist', ...args)
  await fse.mkdirp(rDist('server'))

  const customAppTemplateFile = resolve(ctx.nuxt.options.srcDir, 'app.html')
  const APP_TEMPLATE = fse.existsSync(customAppTemplateFile)
    ? (await fse.readFile(customAppTemplateFile, 'utf-8'))
    : DEFAULT_APP_TEMPLATE

  const DEV_TEMPLATE = APP_TEMPLATE
    .replace(
      '</body>',
      '<script type="module" src="/@vite/client"></script><script type="module" src="/.nuxt/client.js"></script></body>'
    )
  const SPA_TEMPLATE = ctx.nuxt.options.dev ? DEV_TEMPLATE : APP_TEMPLATE
  const SSR_TEMPLATE = ctx.nuxt.options.dev ? DEV_TEMPLATE : APP_TEMPLATE

  await fse.writeFile(rDist('server/index.ssr.html'), SSR_TEMPLATE)
  await fse.writeFile(rDist('server/index.spa.html'), SPA_TEMPLATE)

  if (ctx.nuxt.options.dev) {
    await stubManifest(ctx)
  } else {
    await generateBuildManifest(ctx)
  }
}

export async function generateBuildManifest (ctx: ViteBuildContext) {
  const rDist = (...args: string[]): string => resolve(ctx.nuxt.options.buildDir, 'dist', ...args)

  const viteClientManifest: ViteManifest = await fse.readJSON(rDist('client/manifest.json'))

  // Search for polyfill file, we don't include it in the client entry
  const polyfillName = Object.values(viteClientManifest).find(entry => entry.file.startsWith('polyfills-legacy.'))?.file
  const polyfill = await fse.readFile(rDist('client/' + polyfillName), 'utf-8')

  const clientImports = new Set<string>()
  const clientEntry: Partial<Record<keyof ResourceMeta, Set<string>>> = {
    assets: new Set(),
    css: new Set(),
    dynamicImports: new Set()
  }

  for (const entry in viteClientManifest) {
    if (!viteClientManifest[entry].file.startsWith('polyfills-legacy')) {
      clientImports.add(viteClientManifest[entry].file)
      for (const key of ['css', 'assets', 'dynamicImports']) {
        for (const file of viteClientManifest[entry][key] || []) {
          clientEntry[key].add(file)
        }
      }
    }
    delete viteClientManifest[entry].isEntry
  }

  // @vitejs/plugin-legacy uses SystemJS which need to call `System.import` to load modules
  const clientEntryCode = [
    polyfill,
    'var appConfig = window && window.__NUXT__ && window.__NUXT__.config.app || {}',
    'var publicBase = appConfig.cdnURL || appConfig.baseURL || "/"',
    `var imports = ${JSON.stringify([...clientImports])};`,
    'imports.reduce(function(p, id){return p.then(function(){return System.import(publicBase + appConfig.buildAssetsDir.slice(1) + id)})}, Promise.resolve())'
  ].join('\n')
  const clientEntryName = 'entry-legacy.' + hash(clientEntryCode) + '.js'

  await fse.writeFile(rDist('client', clientEntryName), clientEntryCode, 'utf-8')

  const manifest = normalizeViteManifest({
    [clientEntryName]: {
      file: clientEntryName,
      module: true,
      isEntry: true,
      css: [...clientEntry.css],
      assets: [...clientEntry.assets],
      dynamicImports: [...clientEntry.dynamicImports]
    },
    ...viteClientManifest
  })

  await writeClientManifest(manifest, ctx.nuxt.options.buildDir)

  // Remove SSR manifest from public client dir
  await fse.remove(rDist('client/manifest.json'))
}

// stub manifest on dev
export async function stubManifest (ctx: ViteBuildContext) {
  const clientManifest: Manifest = {
    'empty.js': {
      isEntry: true,
      file: 'empty.js'
    }
  }

  await writeClientManifest(normalizeViteManifest(clientManifest), ctx.nuxt.options.buildDir)
}

export async function generateDevSSRManifest (ctx: ViteBuildContext, css: string[] = []) {
  const devClientManifest: Manifest = {
    '@vite/client': {
      isEntry: true,
      file: '@vite/client',
      css,
      module: true,
      resourceType: 'script'
    },
    'entry.mjs': {
      isEntry: true,
      file: 'entry.mjs',
      module: true,
      resourceType: 'script'
    }
  }

  await writeClientManifest(normalizeViteManifest(devClientManifest), ctx.nuxt.options.buildDir)
}

export async function writeClientManifest (clientManifest: any, buildDir: string) {
  const clientManifestJSON = JSON.stringify(clientManifest, null, 2)
  await fse.writeFile(resolve(buildDir, 'dist/server/client.manifest.json'), clientManifestJSON, 'utf-8')
  await fse.writeFile(resolve(buildDir, 'dist/server/client.manifest.mjs'), `export default ${clientManifestJSON}`, 'utf-8')
}
