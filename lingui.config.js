import { defineConfig } from '@lingui/cli'

export default defineConfig({
  catalogs: [
    {
      include: ['src/**/*.tsx'],
      path: '<rootDir>/src/locales/{locale}/messages',
    },
  ],
  locales: ['en', 'ar', 'fr'],
  sourceLocale: 'en',
})
