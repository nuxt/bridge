import { onGlobalSetup, ref } from '@nuxtjs/composition-api'

import { defineNuxtPlugin, addRouteMiddleware, navigateTo } from '#imports'

export default defineNuxtPlugin(() => {
  const globalsetup = ref('🚧')
  onGlobalSetup(() => {
    globalsetup.value = '✅'
  })

  addRouteMiddleware('local-middleware', (to) => {
    if (to.path === '/add-route-middleware') {
      return navigateTo('/navigation-target')
    }
  })

  return {
    provide: {
      globalsetup
    }
  }
})
