export default (ctx) => {
  const config = ctx.$config
  ctx.$config = new Proxy(config, {
    get (target, prop) {
      if (prop === 'public') {
        return target.public
      }
      return target[prop] ?? target.public?.[prop]
    },
    set (target, prop, value) {
      if (prop === 'public' || prop === 'app') {
        return false // Throws TypeError
      }
      target[prop] = value
      if ('public' in target) {
        target.public[prop] = value
      }
      return true
    }
  })
}
