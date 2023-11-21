<template>
  <div>
    <div>{{ hello }}</div>
    <NuxtChild />
    <NuxtLink to="/legacy/setup">
      to legacy setup
    </NuxtLink>
  </div>
</template>

<script>
export default defineNuxtComponent({
  fetchKey: () => 'hello',
  async asyncData () {
    await nextTick()
    return {
      hello: await $fetch('/api/hello')
    }
  }
})
</script>
