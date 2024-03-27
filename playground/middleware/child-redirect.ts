export default defineNuxtRouteMiddleware(() => {
  return abortNavigation({
    statusCode: 401,
    fatal: true,
    message: 'should not call this middleware'
  })
})
