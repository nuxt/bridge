<script setup lang="ts">
const router = useRouter()
const aborted = ref(false)

function navigate () {
  router.push('/middleware-chain/break?abort', undefined, () => {
    aborted.value = true
  })
}
</script>

<template>
  <div>
    <p>middleware-chain/index.vue</p>
    <button @click="navigate">
      navigate
    </button>
    <p v-if="aborted">
      navigation aborted
    </p>
  </div>
</template>
