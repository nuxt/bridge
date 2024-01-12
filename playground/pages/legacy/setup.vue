<template>
  <div>
    <!-- eslint-disable-next-line vue/singleline-html-element-content-newline -->
    <div v-if="!pending">{{ hello }}</div>
    <NuxtChild />
    <NuxtLink to="/legacy/async-data">
      to legacy async-data
    </NuxtLink>
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

    const hello = computed(() => data.value?.hello)

    return {
      hello,
      pending
    }
  }
})
</script>
