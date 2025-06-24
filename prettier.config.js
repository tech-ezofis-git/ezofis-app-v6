//  @ts-check

/** @type {import('prettier').Config} */
const config = {
  arrowParens: 'always',
  jsxSingleQuote: true,
  plugins: ['prettier-plugin-tailwindcss'],
  quoteProps: 'consistent',
  semi: false,
  singleQuote: true,
  tailwindAttributes: ['classNames'],
  tailwindFunctions: ['cn', 'tv'],
  tailwindStylesheet: './src/styles/index.css',
  trailingComma: 'all',
}

export default config
