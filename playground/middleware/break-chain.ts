export default defineNuxtRouteMiddleware((to) => {
  if ('abort' in to.query) {
    return abortNavigation()
  }
  return navigateTo('/navigation-target')
})
