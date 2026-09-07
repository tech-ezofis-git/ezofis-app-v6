import { defineConfig } from '@lingui/cli'

export default defineConfig({
  catalogs: [
    {
      include: ['src'],
      path: '<rootDir>/src/locales/{locale}/messages',
    },
  ],
  compileNamespace: 'es',
  locales: ['en', 'ar', 'fr', 'ms'],
  sourceLocale: 'en',
})
