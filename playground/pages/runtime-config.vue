<script setup>
const config = useRuntimeConfig()
const serverRuntimeConfig = useState('server-runtime-config', () => config)
const clientRuntimeConfig = process.client ? config : {}

console.log('Config compatibility', config.myValue, config.secretKey)
</script>

<template>
  <div>
    Server runtime config:
    <pre>{{ JSON.stringify(serverRuntimeConfig, null, 2) }}</pre>
    <hr>
    Client runtime config:
    <client-only>
      <pre>{{ JSON.stringify(clientRuntimeConfig, null, 2) }}</pre>
    </client-only>
  </div>
</template>
