<template>
  <div>
    <div>{{ hello }}</div>
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
