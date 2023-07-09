const glob = require('node:glob')
const utils = require('@nuxt/utils')
const ignore = require('ignore');
const fsExtra = require('fs-extra');
const { resolve, relative } = require('pathe')

class Ignore {
    constructor(options) {
      this.rootDir = options.rootDir;
      this.ignoreOptions = options.ignoreOptions;
      this.ignoreArray = options.ignoreArray;
      this.addIgnoresRules();
    }
    static get IGNORE_FILENAME() {
      return ".nuxtignore";
    }
    findIgnoreFile() {
      if (!this.ignoreFile) {
        const ignoreFile = resolve(this.rootDir, Ignore.IGNORE_FILENAME);
        if (fsExtra.existsSync(ignoreFile) && fsExtra.statSync(ignoreFile).isFile()) {
          this.ignoreFile = ignoreFile;
          this.ignore = ignore(this.ignoreOptions);
        }
      }
      return this.ignoreFile;
    }
    readIgnoreFile() {
      if (this.findIgnoreFile()) {
        return fsExtra.readFileSync(this.ignoreFile, "utf8");
      }
    }
    addIgnoresRules() {
      const content = this.readIgnoreFile();
      if (content) {
        this.ignore.add(content);
      }
      if (this.ignoreArray && this.ignoreArray.length > 0) {
        if (!this.ignore) {
          this.ignore = ignore(this.ignoreOptions);
        }
        this.ignore.add(this.ignoreArray);
      }
    }
    filter(paths) {
      if (this.ignore) {
        return this.ignore.filter([].concat(paths || []));
      }
      return paths;
    }
    reload() {
      delete this.ignore;
      delete this.ignoreFile;
      this.addIgnoresRules();
    }
  }

  const processPages = (config) => {
    // keep information about layers directories
    const layers = config._layers
    const layerDirs = layers.map(layer => ({
      src: layer.config.srcDir,
      pages: resolve(layer.config.srcDir, layer.config.dir?.pages || 'pages')
    }))

    // keep defaults if config.router is not defined, otherwise use config.router values
    const { routeNameSplitter = '-', trailingSlash = undefined } = config.router

    const createRoutes = () => {
      const pages = []
      for (const layerDir of layerDirs) {
        const files = []
        const ignoreInstance = new Ignore({
          rootDir: layerDir.src,
          ignoreArray: config?.ignore || [],
        })
        const supportedExtensions = ['vue', 'js', 'ts', 'tsx', 'cts', 'mts']
        const pagesGlob = glob.sync(resolve(layerDir.pages, `**/*.{${supportedExtensions.join(',')}}`))
          .map(file => relative(layerDir.src, file))
        const pagesFiles = ignoreInstance.filter(pagesGlob)
        for (const pageFile of pagesFiles) {
          const page = pageFile
          files.push(page)
        }
        pages.push(utils.createRoutes({
          files,
          srcDir: layerDir.src,
          pagesDir: relative(layerDir.src, layerDir.pages),
          routeNameSplitter,
          supportedExtensions,
          trailingSlash
        }))
      }
      return pages.flat()
    }

    // check if config.build.createRoutes is defined
    config.build = config.build || {}
    if (config.build.createRoutes) {
      const originalCreateRoutes = config.build.createRoutes
      // merge original createRoutes with our createRoutes
      config.build.createRoutes = () => {
        return originalCreateRoutes().concat(createRoutes())
      }
    } else {
      // if config.build.createRoutes is not defined, use our createRoutes
      config.build.createRoutes = createRoutes
    }
  }

  module.exports.processPages = processPages 