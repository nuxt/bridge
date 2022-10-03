<script setup>
const config = useRuntimeConfig()
const serverRuntimeConfig = useState('server-runtime-config', () => config)
const clientRuntimeConfig = process.client ? config : {}

console.log('Config compatibility', config.myValue, config.secretKey)
if (process.server && config.secretKey !== 'nuxt') {
  throw new Error('secret key not accessible')
}
if (config.myValue !== 123) {
  throw new Error('public key not accessible on root')
}
const pluginConfig = useNuxtApp().$modulePlugin
if (process.client && pluginConfig !== '{"myValue":123,"publicMyValue":123}') {
  throw new Error('config not available in plugin')
}
if (process.server && pluginConfig !== '{"secretKey":"nuxt","myValue":123,"publicMyValue":123}') {
  throw new Error('config not available in plugin')
}
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
