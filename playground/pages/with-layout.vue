<script setup>
let message
if (import.meta.client) {
  message = 'Client'
} else if (import.meta.server) {
  message = 'Server'
}

console.log(message)

definePageMeta({
  layout: 'custom'
})

const onClick = async () => {
  await navigateTo('/')
}
</script>

<template>
  <div>
    <div>with-layout.vue</div>
    <button @click="onClick">
      Back To Top
    </button>
  </div>
</template>
