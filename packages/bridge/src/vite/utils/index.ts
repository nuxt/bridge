import { createHash } from 'crypto'

export function uniq<T> (arr: T[]): T[] {
  return Array.from(new Set(arr))
}

// Copied from vue-bundle-renderer utils
const IS_CSS_RE = /\.(?:css|scss|sass|postcss|less|stylus|styl)(\?[^.]+)?$/

export function isCSS (file: string) {
  return IS_CSS_RE.test(file)
}

export function hashId (id: string) {
  return '$id_' + hash(id)
}

export function hash (input: string, length = 8) {
  return createHash('sha256')
    .update(input)
    .digest('hex')
    .slice(0, length)
}
