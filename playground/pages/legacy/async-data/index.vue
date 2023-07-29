<template>
  <div>
    <div>{{ fooParent }}</div>
    <NuxtChild />
  </div>
</template>

<script>
export default defineNuxtComponent({
  asyncData () {
    return {
      fooParent: 'fooParent'
    }
  }
})
</script>
