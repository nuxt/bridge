export default ({ $config }, inject) => {
  inject('modulePlugin', JSON.stringify({
    secretKey: $config.secretKey,
    myValue: $config.myValue,
    publicMyValue: $config.public?.myValue
  }))
}
