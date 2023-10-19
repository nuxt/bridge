
<script setup lang="ts">
const count = ref(0)

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
  </div>
</template>
