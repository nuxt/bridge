import { isScriptProtocol } from 'ufo'

const PROBE_BASE_A = 'https://a.invalid/probe/'
const PROBE_BASE_B = 'https://b.invalid/probe/'

function parseAnchorURL (value: string, base: string = PROBE_BASE_A): URL | null {
  try {
    return new URL(value, base)
  } catch {
    return null
  }
}

// a relative value inherits whichever base it resolves against; an absolute one ignores both
function resolvesWithoutBase (value: string): boolean {
  const resolved = parseAnchorURL(value)
  return !!resolved && resolved.href === parseAnchorURL(value, PROBE_BASE_B)?.href
}

/** Whether a URL string is a path rooted at the current origin, so carries no protocol. */
export function isRootedPath (value: string): boolean {
  if (value[0] !== '/' || value[1] === '/' || value[1] === '\\') {
    return false
  }
  // the URL parser drops ASCII tab and newline, which can join the leading `/` to a host
  return (value[1] !== '\t' && value[1] !== '\n' && value[1] !== '\r') || !resolvesWithoutBase(value)
}

/** Whether a URL string carries its own protocol or authority. */
export function isAbsoluteHref (value: string): boolean {
  return !!value && !isRootedPath(value) && resolvesWithoutBase(value)
}

/** The script-capable protocol a URL string would navigate to, or `null` when it is safe. */
export function getScriptProtocol (value: string): string | null {
  if (!value || isRootedPath(value)) {
    return null
  }
  // browser URL parsers ignore whitespace and control characters around a scheme
  // eslint-disable-next-line no-control-regex
  let resolved = parseAnchorURL(value.replace(/[\u0000-\u001F\u007F\s]+/g, ''))
  // Chromium resolves `view-source:` transparently to the inner URL
  while (resolved?.protocol === 'view-source:') {
    resolved = parseAnchorURL(resolved.pathname)
  }
  if (!resolved) {
    return ''
  }
  return isScriptProtocol(resolved.protocol) ? resolved.protocol : null
}
