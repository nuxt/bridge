<template>
  <div>
    <div v-if="!pending">
      {{ hello }}
    </div>
    <NuxtChild />
  </div>
</template>

<script>
export default defineNuxtComponent({
  setup () {
    const { data, pending } = useLazyAsyncData('hello-async', async () => {
      const hello = await $fetch('/api/hello')
      return {
        hello
      }
    })

    return {
      hello: data.value?.hello,
      pending
    }
  }
})
</script>
