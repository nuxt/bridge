export default defineEventHandler((event) => {
  const query = getQuery(event)

  if (query.clear) {
    return 'ClearableData'
  }

  return 'Hello API'
})
