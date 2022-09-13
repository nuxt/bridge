# 🌉 Nuxt Bridge

> Experience Nuxt 3 features on existing Nuxt 2 projects.

Bridge is a forward-compatibility layer that allows you to experience many of the new Nuxt 3 features by simply installing and enabling a Nuxt module.

Using Nuxt Bridge, you can make sure your project is (almost) ready for Nuxt 3 and have the best developer experience without needing a major rewrite or risk breaking changes.

⚠️ **Note:** Nuxt Bridge provides identical features to Nuxt 3 ([Nuxt 3 docs](https://v3.nuxtjs.org/guide/features/views)) but there are some limitations, notably that `useAsyncData` and `useFetch` composables are not available. Please read the rest of this page for details. 

⚠️ **Note:** Nuxt Bridge does not support Internet Explorer. Supported browsers are listed at https://caniuse.com/es6-module-dynamic-import.

🌱 **Note:** If you're starting a fresh Nuxt project, please skip this module and directly go to the [Nuxt 3 Installation](https://v3.nuxtjs.org/getting-started/quick-start).

## 💻 Development

- Clone repository
- Ensure you have the latest LTS version of Node.js installed
- Install dependencies with `npx yarn install`
- Run `npx yarn dev:prepare` to activate passive development
- Open playground with `npx yarn dev`

Learn more about in our documentation on [how to contribute to Nuxt](https://v3.nuxtjs.org/community/contribution).


## Installation

### Upgrade to the latest Nuxt 2

Make sure your dev server (`nuxt dev`) isn't running, remove any package lock files (`package-lock.json` and `yarn.lock`), and install the latest `nuxt-edge`:

```diff [package.json]
- "nuxt": "^2.15.0"
+ "nuxt-edge": "latest"
```

Then, reinstall your dependencies:

```bash
# Using yarn
yarn install

# Using npm
npm install
```

Once the installation is complete, make sure both development and production builds are working as expected before proceeding.

### Install Nuxt Bridge

Install `@nuxt/bridge-edge` as a development dependency:

```bash

# Using yarn
yarn add --dev @nuxt/bridge@npm:@nuxt/bridge-edge

# Using npm
npm install -D @nuxt/bridge@npm:@nuxt/bridge-edge
```

## Update your scripts

You will also need to update your scripts within your `package.json` to reflect the fact that Nuxt will now produce a Nitro server as build output.

### Nuxi

Nuxt 3 introduced the new Nuxt CLI command [`nuxi`](https://v3.nuxtjs.org/api/commands/add). Update your scripts as follows to leverage the better support from Nuxt Bridge:

```diff
{
  "scripts": {
-   "dev": "nuxt",
+   "dev": "nuxi dev",
-   "build": "nuxt build",
+   "build": "nuxi build",
-   "start": "nuxt start",
+   "start": "nuxi preview"
  }
}
```

### Static target

If you have set `target: 'static'` in your `nuxt.config` then you need to ensure that you update your build script to be `nuxi generate`.

```json [package.json]
{
  "scripts": {
    "build": "nuxi generate"
  }
}
```

### Server target

For all other situations, you can use the `nuxi build` command.

```json [package.json]
{
  "scripts": {
    "build": "nuxi build",
    "start": "nuxi preview"
  }
}
```

## Update `nuxt.config`

Please make sure to avoid any CommonJS syntax such as `module.exports`, `require` or `require.resolve` in your config file. It will soon be deprecated and unsupported.

You can use static `import`, dynamic `import()` and `export default` instead. Using TypeScript by renaming to `nuxt.config.ts` is also possible and recommended.

```ts [nuxt.config.js|ts]
import { defineNuxtConfig } from '@nuxt/bridge'

export default defineNuxtConfig({
  // Your existing configuration
})
```

## Update `tsconfig.json`

If you are using TypeScript, you can edit your `tsconfig.json` to benefit from auto-generated Nuxt types:

```diff [tsconfig.json]
{
+ "extends": "./.nuxt/tsconfig.json",
  "compilerOptions": {
    ...
  }
}
```

Keep in mind that all options extended from `./.nuxt/tsconfig.json` will be overwritten by the options defined in your `tsconfig.json`.

Overwriting options such as `"compilerOptions.paths"` with your own configuration will lead TypeScript to not factor in the module resolutions from `./.nuxt/tsconfig.json`. This can lead to module resolutions such as `#imports` not being recognized.

In case you need to extend options provided by `./.nuxt/tsconfig.json` further, you can use the `alias` property withing your `nuxt.config`. `nuxi` will pick them up and extend `./.nuxt/tsconfig.json` accordingly.

## Migrate Composition API

If you were using `@vue/composition-api` or `@nuxtjs/composition-api`, please read the [composition api migration guide](https://v3.nuxtjs.org/bridge/bridge-composition-api).

### Migrate from CommonJS to ESM

Nuxt 3 natively supports TypeScript and ECMAScript Modules. Please check [Native ES Modules](https://v3.nuxtjs.org/guide/going-further/esm) for more info and upgrading.

## Remove incompatible and obsolete modules

- Remove `@nuxt/content` (1.x). A rewrite for Nuxt 3 is planned (2.x)
- Remove `nuxt-vite`: Bridge enables same functionality
- Remove `@nuxt/typescript-build`: Bridge enables same functionality
- Remove `@nuxt/typescript-runtime` and `nuxt-ts`: Nuxt 2 has built-in runtime support
- Remove `@nuxt/nitro`: Bridge injects same functionality
- Remove `@vue/composition-api` from your dependencies ([migration guide](https://v3.nuxtjs.org/bridge/bridge-composition-api)).
- Remove `@nuxtjs/composition-api` from your dependencies (and from your modules in `nuxt.config`) ([migration guide](https://v3.nuxtjs.org/bridge/bridge-composition-api)).

## Exclude built Nitro folder from git

Add the folder `.output` to the `.gitignore` file.

## Ensure everything goes well

✔️ Try with `nuxi dev` and `nuxi build` (or `nuxi generate`) to see if everything goes well.

🐛 Is something wrong? Please let us know by creating an issue. Also, you can easily disable the bridge in the meantime:

```ts [nuxt.config.js|ts]
import { defineNuxtConfig } from '@nuxt/bridge'

export default defineNuxtConfig({
  bridge: false // Temporarily disable bridge integration
})
```

## New plugins format (optional)

You can now migrate to the Nuxt 3 plugins API, which is slightly different in format from Nuxt 2.

Plugins now take only one argument (`nuxtApp`). You can find out more in [the docs](https://v3.nuxtjs.org/guide/directory-structure/plugins).

```js
export default defineNuxtPlugin(nuxtApp => {
  nuxtApp.provide('injected', () => 'my injected function')
  // now available on `nuxtApp.$injected`
})
```

If you want to use the new Nuxt composables (such as `useNuxtApp` or `useRuntimeConfig`) within your plugins, you will need to use the `defineNuxtPlugin` helper for those plugins.

Although a compatibility interface is provided via `nuxtApp.vueApp` you should avoid registering plugins, directives, mixins or components this way without adding your own logic to ensure they are not installed more than once, or this may cause a memory leak.

## New `useHead` (optional)

Nuxt Bridge provides a new Nuxt 3 meta API that can be accessed with a new `useHead` composable.

```vue
<script setup>
useHead({
  title: 'My Nuxt App',
})
</script>
```

You will also need to enable this feature explicitly in your `nuxt.config`:

```js
import { defineNuxtConfig } from '@nuxt/bridge'

export default defineNuxtConfig({
  bridge: {
    meta: true
  }
})
```

This `useHead` composable uses `@vueuse/head` under the hood (rather than `vue-meta`) to manipulate your `<head>`.
Accordingly, we recommend not to use both the native Nuxt 2 `head()` properties as well as `useHead`, as they may conflict.

For more information on how to use this composable, see [the docs](https://v3.nuxtjs.org/guide/features/head-management).

## Feature Flags

You can optionally disable some features from bridge or opt-in to less stable ones. In normal circumstances, it is always best to stick with defaults!

You can check [bridge/src/module.ts](https://github.com/nuxt/framework/blob/main/packages/bridge/src/module.ts) for latest defaults.

```ts [nuxt.config.js|ts]
import { defineNuxtConfig } from '@nuxt/bridge'

export default defineNuxtConfig({
  bridge: {

    // -- Opt-in features --

    // Use Vite as the bundler instead of webpack 4
    // vite: true,

    // Enable Nuxt 3 compatible useHead
    // meta: true,


    // -- Default features --

    // Use legacy server instead of Nitro
    // nitro: false,

    // Use legacy generator rather than new nitro prerenderer
    // nitroGenerator: false,

    // Disable nuxt 3 compatible `nuxtApp` interface
    // app: false,

    // Disable Composition API support
    // capi: false,

    // ... or just disable legacy Composition API support
    // capi: {
    //   legacy: false
    // },

    // Do not transpile modules
    // transpile: false,

    // Disable composables auto importing
    // imports: false,

    // Do not warn about module incompatibilities
    // constraints: false
  },

  vite: {
    // Config for Vite
  }
})
```

## License

[MIT](https://github.com/nuxt/nuxt.js/blob/dev/LICENSE)
