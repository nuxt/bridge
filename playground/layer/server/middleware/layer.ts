import { appendResponseHeader, defineEventHandler } from 'h3'

export default defineEventHandler((event) => {
  appendResponseHeader(
    event,
    'x-layer',
    'active'
  )
})
