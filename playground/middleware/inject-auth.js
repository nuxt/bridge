import { defineNuxtRouteMiddleware } from '#app'

export default defineNuxtRouteMiddleware(({ redirect }) => {
  redirect('/auth')
})
