<script setup>
const name = ref('')
const query = computed(() => ({ name: name.value }))

const { data, refresh } = useLazyFetch('/api/hello', { query, watch: false })
</script>

<template>
  <div>
    <h1>Lazy Fetch</h1>
    <input v-model="name">
    <button @click="() => refresh()">
      Refresh
    </button>
    <div>{{ data }}</div>
  </div>
</template>
