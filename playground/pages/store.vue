<script setup lang="ts">
const { $store } = useNuxtApp()

const test = computed(() => $store.state.test)
</script>

<template>
  <div>
    <p>state is: {{ test }}</p>
  </div>
</template>
