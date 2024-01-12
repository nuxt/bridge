import { defineNuxtRouteMiddleware, abortNavigation } from '#imports'

export default defineNuxtRouteMiddleware((to) => {
  if ('abort' in to.query) {
    return abortNavigation({
      statusCode: 401,
      fatal: true
    })
  }
})
