<template>
  <p>cookie-with-redirect.vue</p>
</template>

<script setup>
definePageMeta({
  middleware: defineNuxtRouteMiddleware(async () => {
    useCookie('redirect-test').value = 'foo'

    // Immediately redirect during SSR
    return navigateTo('/')
  })
})
</script>
