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

const { data: clearableData1 } = useLazyAsyncData('clearableData-1', async () => {
  const text = await $fetch('/api/hello?clear=true')
  return {
    text
  }
})

const { data: clearableData2, clear } = useLazyAsyncData('clearableData-2', async () => {
  const text = await $fetch('/api/hello?clear=true')
  return {
    text
  }
})

const { data: immediateFalseData } = useLazyAsyncData('immediateFalse', async () => {
  const text = await $fetch('/api/hello')
  return {
    text
  }
}, { immediate: false })

if (process.server) {
  clearNuxtData('clearableData-1')
  clear()
} else {
  nextTick(() => {
    clearNuxtData('clearableData-1')
    clear()
  })
}

</script>

<template>
  <div>
    <div>data1: {{ data1 }}</div>

    <!-- eslint-disable-next-line vue/singleline-html-element-content-newline -->
    <div id="immediate-data">{{ immediateFalseData === null ? "null" : (immediateFalseData === undefined ? 'undefined' : immediateFalseData) }}</div>

    <div>error1: {{ error1 }}</div>
    <div>error2: {{ error2 }}</div>
    <div>error3: {{ error3 }}</div>
    <div>clearableData-1: {{ clearableData1?.text }}</div>
    <div>clearableData-2: {{ clearableData2?.text }}</div>
  </div>
</template>
