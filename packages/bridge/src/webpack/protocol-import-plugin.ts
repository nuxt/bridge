import webpack from 'webpack'
import type { Compiler } from 'webpack'

// ref: https://github.com/webpack/webpack/blob/main/lib/node/NodeTargetPlugin.js#L67C2-L67C11
export class ProtocolImportPlugin {
  apply (compiler: Compiler) {
    new webpack.ExternalsPlugin('commonjs', /^node:/).apply(compiler)
  }
}
