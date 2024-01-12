export const state = () => ({
  test: '❌'
})

export const actions = {
  nuxtServerInit ({ state }) {
    state.test = '✅'
  }
}

export const mutations = {
  setTest (state, value) {
    state.test = value
  }
}
