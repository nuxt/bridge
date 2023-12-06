import { describe, expect, it } from 'vitest'
import * as VueFunctions from 'vue'
import type { Import } from 'unimport'
import { createUnimport } from 'unimport'
import type { Plugin } from 'vite'
import { TransformPlugin } from '../src/imports/transform'
import { defaultPresets } from '../src/imports/presets'

describe('imports:transform', () => {
  const imports: Import[] = [
    { name: 'ref', as: 'ref', from: 'vue' },
    { name: 'computed', as: 'computed', from: 'bar' },
    { name: 'foo', as: 'foo', from: 'excluded' }
  ]

  const ctx = createUnimport({
    imports
  })

  const transformPlugin = TransformPlugin.raw({ ctx, options: { transform: { exclude: [/node_modules/] } } }, { framework: 'rollup' }) as Plugin
  const transform = async (source: string) => {
    const result = await (transformPlugin.transform! as Function).call({ error: null, warn: null } as any, source, '')
    return typeof result === 'string' ? result : result?.code
  }

  it('should correct inject', async () => {
    expect(await transform('const a = ref(0)')).toMatchInlineSnapshot('"import { ref } from \'vue\';\nconst a = ref(0)"')
  })

  it('should ignore existing imported', async () => {
    expect(await transform('import { ref } from "foo"; const a = ref(0)')).to.equal(undefined)
    expect(await transform('import { computed as ref } from "foo"; const a = ref(0)')).to.equal(undefined)
    expect(await transform('import ref from "foo"; const a = ref(0)')).to.equal(undefined)
    expect(await transform('import { z as ref } from "foo"; const a = ref(0)')).to.equal(undefined)
    expect(await transform('let ref = () => {}; const a = ref(0)')).to.equal(undefined)
    expect(await transform('let { ref } = Vue; const a = ref(0)')).to.equal(undefined)
    expect(await transform('let [\ncomputed,\nref\n] = Vue; const a = ref(0); const b = ref(0)')).to.equal(undefined)
  })

  it('should ignore comments', async () => {
    const result = await transform('// import { computed } from "foo"\n;const a = computed(0)')
    expect(result).toMatchInlineSnapshot(`
      "import { computed } from 'bar';
      // import { computed } from "foo"
      ;const a = computed(0)"
    `)
  })

  it('should exclude files from transform', async () => {
    expect(await transform('excluded')).toEqual(undefined)
  })
})

const excludedVueHelpers = [
  'mergeDefaults',
  'version',
  'warn',
  'watchPostEffect',
  'watchSyncEffect',
  'set',
  'del',
  'default'
]

describe('imports:vue', () => {
  for (const name of Object.keys(VueFunctions)) {
    if (excludedVueHelpers.includes(name)) {
      continue
    }
    it(`should register ${name} globally`, () => {
      expect(defaultPresets.find(a => a.from === 'vue')!.imports).toContain(name)
    })
  }
})
