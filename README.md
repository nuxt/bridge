# 🌉 Nuxt Bridge

> Reduce the differences with Nuxt 3 and reduce the burden of migration to Nuxt 3.

Bridge is a forward-compatibility layer that allows you to experience many of the new Nuxt 3 features by simply installing and enabling a Nuxt module.

Using Nuxt Bridge, you can make sure your project is (almost) ready for Nuxt 3 and you can gradually proceed with the transition to Nuxt 3.

⚠️ **Note:** Nuxt Bridge provides identical features to Nuxt 3 ([Nuxt 3 docs](https://nuxt.com/docs/getting-started/views#views)) but there are some limitations, notably that `useAsyncData` and `useFetch` composables are not available. Please read the rest of this page for details. 

⚠️ **Note:** Nuxt Bridge does not support Internet Explorer. Supported browsers are listed at https://caniuse.com/es6-module-dynamic-import.

🌱 **Note:** If you're starting a fresh Nuxt project, please skip this module and directly go to the [Nuxt 3 Installation](https://nuxt.com/docs/getting-started/introduction).
## Docs

Visit the [documentation site](https://nuxt.com/docs/bridge/overview) for migration guide.

## 💻 Development

- Clone repository
- Ensure you have the latest LTS version of Node.js installed
- Enable [Corepack](https://github.com/nodejs/corepack) using `corepack enable` to enable `pnpm` and `yarn`
- Install dependencies with `pnpm install`
- Run `pnpm dev:prepare` to activate passive development
- Open playground with `pnpm dev`

Learn more about in our documentation on [how to contribute to Nuxt](https://nuxt.com/docs/community/contribution).

## License

[MIT](https://github.com/nuxt/nuxt.js/blob/dev/LICENSE)
