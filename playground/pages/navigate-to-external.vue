<template>
  <div>You should not see me</div>
</template>

<script setup>
navigateTo('https://example.com/', { external: true })
</script>
<script>
export default {
  middleware: ['redirect']
}
</script>
