export default defineNuxtRouteMiddleware(() => {
  throw new Error('This middleware should not be called after the navigation has been redirected or aborted')
})
