
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:html' as any, (html: any) => {
    for (const bodyPart of html.body) {
      if (bodyPart.includes('Nitro Plugin')) {
        html.bodyPrepend.push('<p>Prepended HTML</p>')
        return
      }
    }
  })
})
