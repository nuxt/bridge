<script setup>
let message
if (process.client) {
  message = 'Client'
} else if (process.server) {
  message = 'Server'
}

console.log(message)

definePageMeta({
  layout: 'custom'
})
</script>

<template>
  <div>
    <div>with-layout.vue</div>
  </div>
</template>
