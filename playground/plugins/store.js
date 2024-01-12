export default defineNuxtPlugin(() => {
  const { $store } = useNuxtApp()

  $store.commit('setTest', '✅')
})
