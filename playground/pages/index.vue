<template>
  <div>
    <div>Hello Vue {{ version }}!</div>
    <div>
      State: {{ state }} <button @click="updateState">
        Update
      </button>
    </div>
    Rendered on server: {{ serverBuild }}

    <section class="links-container">
      <h2>Links</h2>
      <ul>
        <li>
          <NuxtLink to="/legacy-capi">
            legacy-capi
          </NuxtLink>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup>
useMeta({ meta: [{ name: 'description', content: 'This is a page to demo Nuxt Bridge.' }] })
const version = ref('2')
const state = useState('test-state')
state.value = '123'
const updateState = () => { state.value = '456' }
const serverBuild = useState('server-build', () => getCurrentInstance().proxy.$isServer)
</script>

<style scoped>
.links-container {
  padding: 8px 0;

}
.links-container h2 {
  margin: 8px 0;
}
.links-container ul {
  padding-inline-start: 24px;
}
</style>
