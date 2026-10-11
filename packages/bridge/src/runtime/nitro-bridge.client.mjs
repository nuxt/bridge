// Ensure `globalThis.$fetch` is set for code that does not import `$fetch` explicitly
import '#build/fetch.mjs'

export default () => {}
