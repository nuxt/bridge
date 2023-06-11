<template>
  <div>
    <Nuxt />
    <hr>
    Route: {{ route.path }}
  </div>
</template>

<script>
export default {
  setup () {
    const route = useRoute()
    useHead({
      titleTemplate (title) {
        return `${title} - Nuxt Bridge Playground`
      }
    })
    return { route }
  }
}
</script>
