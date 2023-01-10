<template>
  <div>You should not see me</div>
</template>

<script setup>
navigateTo('/navigation-target', { replace: true, redirectCode: 301 })
</script>
