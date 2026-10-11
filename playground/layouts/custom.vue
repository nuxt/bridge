<script setup lang="ts">
const count = ref(0)
const customFetchType = typeof customFetch

</script>

<template>
  <div>
    Custom Layout:
    <Nuxt />

    <div class="count">
      {{ count }}
    </div>
    <button class="add-count" @click="count++">
      add count
    </button>
    <div class="custom-fetch">
      customFetch: {{ customFetchType }}
    </div>
  </div>
</template>
