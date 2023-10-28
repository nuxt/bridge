import { withoutTrailingSlash } from 'ufo'

export default defineNuxtRouteMiddleware((to) => {
  if (useRequestHeaders(['trailing-slash'])['trailing-slash'] && to.fullPath.endsWith('/')) {
    return navigateTo(withoutTrailingSlash(to.fullPath), { redirectCode: 307 })
  }
  if (to.path.startsWith('/redirect/')) {
    return navigateTo('/navigation-target')
  }
  if (to.path === '/navigate-to-external') {
    return navigateTo('/', { external: true })
  }
  if (to.path === '/navigate-to-false') {
    return false
  }
})
