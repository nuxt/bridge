<script setup lang="ts">
const { data: data1, error: error1 } = useLazyAsyncData('fetch-1', async () => {
  const hello = await $fetch('/api/hello')
  return {
    hello
  }
})

const { error: error2 } = useLazyAsyncData('fetch-2', () => {
  throw new Error('fetch-2 error')
})

const { error: error3 } = useLazyAsyncData('fetch-3', () => {
  throw new Error('fetch-3 error')
})

const { data: clearableData } = useLazyAsyncData('clearableData', async () => {
  return {
    text: 'clear data'
  }
})

if (process.server) {
  clearNuxtData('clearableData')
} else {
  nextTick(() => {
    clearNuxtData('clearableData')
  })
}

</script>

<template>
  <div>
    <div>data1: {{ data1 }}</div>
    <div>error1: {{ error1 }}</div>
    <div>error2: {{ error2 }}</div>
    <div>error3: {{ error3 }}</div>
    <div>clearData: {{ clearableData?.text }}</div>
  </div>
</template>
