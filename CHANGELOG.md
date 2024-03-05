# Changelog


## v3.1.0

[compare changes](https://github.com/nuxt/bridge/compare/v3.0.0...v3.1.0)

### 🚀 Enhancements

- Port upstream dedupe options ([#1082](https://github.com/nuxt/bridge/pull/1082))
- Add `useRequestURL` to match upstream ([#1110](https://github.com/nuxt/bridge/pull/1110))
- Add esbuild option for webpack + typescript ([#1065](https://github.com/nuxt/bridge/pull/1065))

### 🩹 Fixes

- Change `isTSX` option to opt-in ([#1064](https://github.com/nuxt/bridge/pull/1064))
- Resolve `hookable` to installed version ([#1086](https://github.com/nuxt/bridge/pull/1086))
- Update return for `useRequestEvent` to include `undefined` ([#1089](https://github.com/nuxt/bridge/pull/1089))
- Prevent duplicate manifest generation ([#1070](https://github.com/nuxt/bridge/pull/1070))
- Support `script setup` and `script` together in webpack ([#1104](https://github.com/nuxt/bridge/pull/1104))
- Ignore CallExpression other than `defineComponent` ([#1109](https://github.com/nuxt/bridge/pull/1109))
- Early return from transform when no arguments ([#1124](https://github.com/nuxt/bridge/pull/1124))
- Align error param in showError/createError with H3 ([#1127](https://github.com/nuxt/bridge/pull/1127))

### 🏡 Chore

- Use workspace version of bridge-schema ([#1068](https://github.com/nuxt/bridge/pull/1068))
- Add release script ([cffcd07](https://github.com/nuxt/bridge/commit/cffcd07))
- Mention contributors in release changelog/notes ([977d55f](https://github.com/nuxt/bridge/commit/977d55f))


### ❤️ Contributors
- Daniel Roe (@danielroe)
- Ryota Watanabe (@wattanx)
