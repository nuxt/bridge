import { defineNuxtRouteMiddleware, navigateTo } from '#app'

export default defineNuxtRouteMiddleware((to) => {
  if (to.path === '/navigate-to-external') {
    return navigateTo('/', { external: true })
  }
  if (to.path === '/redirect') {
    return navigateTo('/navigation-target')
  }
})
