<template>
  <div>
    <img src="~/assets/logo.svg" class="h-20 mb-4">
    <img src="/public.svg" class="h-20 mb-4">
    <img :src="logo" class="h-20 mb-4">
  </div>
</template>

<script setup>
import logo from '~/assets/logo.svg'
</script>

<style>
#__nuxt {
  background-image: url('~/assets/logo.svg');
}
body {
  background-image: url('/public.svg');
}
</style>
