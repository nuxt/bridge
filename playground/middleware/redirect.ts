import { defineNuxtRouteMiddleware, navigateTo, abortNavigation } from '#app'

export default defineNuxtRouteMiddleware((to) => {
  if ('abort' in to.query) {
    return abortNavigation({
      statusCode: 401,
      fatal: true
    })
  }
  if (to.path === '/navigate-to-external') {
    return navigateTo('/', { external: true })
  }
  if (to.path === '/redirect') {
    return navigateTo('/navigation-target')
  }
})
