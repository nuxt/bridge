import globals from 'globals'
import neostandard from 'neostandard'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'
import jsdoc from 'eslint-plugin-jsdoc'
import pluginUnicorn from 'eslint-plugin-unicorn'
import { defineConfig } from 'eslint/config'

export default defineConfig(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/schema/**',
      '**/*.tmpl.*',
      '**/sw.js',
      '**/.nuxt/**',
      '**/.output/**',
    ],
  },
  ...neostandard({ ts: true }),
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/vue2-recommended'],
  jsdoc.configs['flat/recommended'],
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
        NodeJS: 'readonly',
        $fetch: 'readonly',
      },
    },
    settings: {
      jsdoc: {
        tagNamePreference: {
          warning: 'warning',
          note: 'note',
        },
      },
      'import-x/resolver': {
        typescript: true,
        node: true,
      },
    },
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },
  {
    plugins: {
      unicorn: pluginUnicorn,
    },
  },
  {
    rules: {
      'no-console': 'off',
      'vue/multi-word-component-names': 'off',
      'vue/one-component-per-file': 'off',
      'vue/require-default-prop': 'off',
      'vue/no-multiple-template-root': 'off',
      'jsdoc/require-jsdoc': 'off',
      'jsdoc/require-param': 'off',
      'jsdoc/require-returns': 'off',
      'jsdoc/require-param-type': 'off',
      'jsdoc/no-undefined-types': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true,
        caughtErrors: 'none',
      }],

      // @nuxtjs/eslint-config-typescript
      'no-unused-vars': 'off',
      'no-undef': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/triple-slash-reference': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-wrapper-object-types': 'off',
      '@typescript-eslint/no-require-imports': 'off',

      // @nuxtjs/eslint-config
      'import-x/order': 'error',
      'import-x/first': 'error',
      'import-x/no-mutable-exports': 'error',
      'import-x/no-unresolved': 'off',
      'arrow-parens': ['error', 'as-needed', { requireForBlockBody: true }],
      'prefer-const': ['error', { destructuring: 'any', ignoreReadBeforeAssign: false }],
      'no-lonely-if': 'error',
      curly: ['error', 'all'],
      'require-await': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'no-useless-rename': 'error',

      // unicorn
      'unicorn/error-message': 'error',
      'unicorn/escape-case': 'error',
      'unicorn/no-instanceof-array': 'error',
      'unicorn/no-new-buffer': 'error',
      'unicorn/number-literal-case': 'error',
      'unicorn/prefer-includes': 'error',
      'unicorn/prefer-string-starts-ends-with': 'error',
      'unicorn/prefer-dom-node-text-content': 'error',
      'unicorn/prefer-type-error': 'error',
      'unicorn/throw-new-error': 'error',

      // Vue parsing error
      'vue/no-parsing-error': ['error', { 'x-invalid-end-tag': false }],
      'vue/max-attributes-per-line': ['error', { singleline: 5 }],

      // stylistic
      '@stylistic/quote-props': 'off',
      '@stylistic/comma-dangle': 'off',
      '@stylistic/no-multiple-empty-lines': 'off',
      '@stylistic/jsx-quotes': 'off',
    },
  },

  {
    files: [
      '**/pages/**/*.{js,ts,vue}',
      '**/layouts/**/*.{js,ts,vue}',
      '**/app.{js,ts,vue}',
      '**/error.{js,ts,vue}',
    ],
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/no-multiple-template-root': 'error',
    },
  }
)
