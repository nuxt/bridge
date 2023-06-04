import { defineNuxtRouteMiddleware } from '#app'

// TODO: `defineNuxtMiddleware` is not yet compatible with Nuxt3.
export default defineNuxtRouteMiddleware(({ redirect }) => {
  redirect('/auth')
})
