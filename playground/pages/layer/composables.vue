<template>
  <div>
    <p>layered composable: {{ layeredComposable }}</p>
  </div>
</template>

<script setup>
const layeredComposable = useLayeredComposable()
</script>
