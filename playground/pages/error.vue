<template>
  <div>
    {{ state.attr }}
    {{ data.something }}
  </div>
</template>

<script setup>
throw createError({ statusCode: 422, fatal: true, statusMessage: 'This is a custom error' })
// eslint-disable-next-line no-unreachable
const state = ref({ attr: 'Hello World' })
</script>
