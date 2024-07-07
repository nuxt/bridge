<template>
  <div>
    <Nuxt />
    <hr>
    Route: {{ $route.path }}
  </div>
</template>

<script>
export default {
  setup () {
    useHead({
      titleTemplate (title) {
        return `${title} - Nuxt Bridge Playground`
      }
    })
  }
}
</script>
