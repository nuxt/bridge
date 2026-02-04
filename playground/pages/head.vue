<script>
import { Title, Meta } from '#build/components'

export default defineNuxtComponent({
  components: {
    // eslint-disable-next-line vue/no-reserved-component-names
    Title,
    // eslint-disable-next-line vue/no-reserved-component-names
    Meta
  },
  head () {
    return {
      htmlAttrs: {
        class: 'html-attrs-test'
      }
    }
  },
  setup () {
    const a = ref('')
    useHead({
      bodyAttrs: {
        class: 'body-attrs-test'
      },
      script: [
        {
          src: 'https://a-body-appended-script.com',
          body: true
        }
      ],
      meta: [{ name: 'description', content: 'first' }]
    })
    useHead({ meta: [{ charset: 'utf-16' }, { name: 'description', content: computed(() => `${a.value} with an inline useHead call`) }] })
    a.value = 'overriding'
  }
})
</script>

<template>
  <div>
    <Head>
      <div>
        <Title>Using a dynamic component</Title>
        <Meta http-equiv="content-security-policy" content="default-src https" />
      </div>
    </Head>
  </div>
</template>
