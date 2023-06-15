import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  declaration: true,
  entries: [
    {
      input: 'src/config/index',
      outDir: 'schema',
      name: 'config',
      builder: 'untyped',
      defaults: {
        dev: false,
        ssr: true,
        buildAssetsDir: '_nuxt',
        srcDir: '',
        buildDir: '.nuxt',
        dir: {
          store: 'store'
        },
        loading: {},
        sourcemap: {},
        vue: {},
        manifest: {},
        messages: {},
        postcss: {},
        build: {},
        generate: {},
        app: {},
        _nuxtConfigFiles: [],
        rootDir: '/<rootDir>/',
        vite: {
          base: '/'
        }
      }
    },
    'src/index'
  ],
  externals: [
    // Type imports
    'vue-meta',
    'vue-router',
    'vue-bundle-renderer',
    '@vueuse/head',
    'vue',
    'hookable',
    'nitropack',
    'webpack',
    'webpack-bundle-analyzer',
    'rollup-plugin-visualizer',
    'vite',
    'extract-css-chunks-webpack-plugin',
    'terser-webpack-plugin',
    'css-minimizer-webpack-plugin',
    'webpack-dev-middleware',
    'h3',
    'webpack-hot-middleware',
    'postcss',
    'consola',
    'ignore',
    // Implicit
    '@vue/compiler-core',
    '@vue/shared',
    'untyped'
  ]
})
