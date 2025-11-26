import js from '@eslint/js'
import pluginLingui from 'eslint-plugin-lingui'
import perfectionist from 'eslint-plugin-perfectionist'
import prettier from 'eslint-plugin-prettier/recommended'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  pluginLingui.configs['flat/recommended'],
  { ignores: ['dist'] },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      prettier,
    ],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
  {
    plugins: {
      perfectionist,
    },
    rules: {
      'perfectionist/sort-enums': ['error'],
      'perfectionist/sort-exports': ['error', { newlinesBetween: 'never' }],
      'perfectionist/sort-imports': [
        'error',
        { internalPattern: ['^@/.+'], newlinesBetween: 'never' },
      ],
      'perfectionist/sort-interfaces': [
        'error',
        {
          customGroups: [
            {
              elementNamePattern: '^get.+',
              groupName: 'getters',
            },
            {
              elementNamePattern: '^set.+',
              groupName: 'setters',
            },
            {
              elementNamePattern: '^on.+',
              groupName: 'callbacks',
            },
          ],
          groups: [
            'member',
            'optional-member',
            'method',
            'optional-method',
            'getters',
            'setters',
            'callbacks',
          ],
        },
      ],
      'perfectionist/sort-jsx-props': [
        'error',
        {
          customGroups: [
            {
              elementNamePattern: '^get.+',
              groupName: 'getters',
            },
            {
              elementNamePattern: '^set.+',
              groupName: 'setters',
            },
            {
              elementNamePattern: '^on.+',
              groupName: 'callbacks',
            },
          ],
          groups: [
            'unknown',
            'shorthand-prop',
            'multiline-prop',
            'getters',
            'setters',
            'callbacks',
          ],
          type: 'natural',
        },
      ],
      'perfectionist/sort-modules': ['error'],
      'perfectionist/sort-named-exports': ['error'],
      'perfectionist/sort-named-imports': ['error'],
      'perfectionist/sort-object-types': [
        'error',
        { groups: ['member', 'method'], type: 'natural' },
      ],
      'perfectionist/sort-objects': [
        'error',
        {
          customGroups: {
            xs: '^xs$',
            sm: '^sm$',
            md: '^md$',
            lg: '^lg$',
            xl: '^xl$',
          },
          groups: ['xs', 'sm', 'md', 'lg', 'xl'],
          useConfigurationIf: {
            allNamesMatchPattern: '^xs|sm|md|lg|xl$',
          },
        },
        {
          // Fallback configuration for other objects
          customGroups: [
            {
              elementNamePattern: '^get.+',
              groupName: 'getters',
            },
            {
              elementNamePattern: '^set.+',
              groupName: 'setters',
            },
            {
              elementNamePattern: '^on.+',
              groupName: 'callbacks',
            },
          ],
          groups: ['member', 'method', 'getters', 'setters', 'callbacks'],
          type: 'natural',
        },
      ],
      'perfectionist/sort-variable-declarations': ['error'],
    },
  },
)
