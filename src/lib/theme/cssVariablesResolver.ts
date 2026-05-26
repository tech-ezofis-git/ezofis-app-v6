import type { CSSVariablesResolver } from '@mantine/core'

/**
 * Bridges Mantine component CSS variables to the app's design-token system.
 * Tokens are defined in src/styles/light.css and dark.css.
 */
const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {
    '--mantine-color-body': 'var(--surface)',
    '--mantine-color-text': 'var(--text-primary)',
    '--mantine-color-dimmed': 'var(--text-secondary)',
    '--mantine-color-placeholder': 'var(--text-muted)',
    '--mantine-color-default': 'var(--surface)',
    '--mantine-color-default-hover': 'var(--surface-hover)',
    '--mantine-color-default-color': 'var(--text-primary)',
    '--mantine-color-default-border': 'var(--border-default)',
    '--mantine-color-anchor': 'var(--accent-primary)',
    '--mantine-primary-color-filled': 'var(--accent-primary)',
    '--mantine-primary-color-filled-hover': 'var(--primary-10)',
    '--mantine-color-error': 'var(--error-main)',
    '--mantine-color-success': 'var(--green-9)',
    '--mantine-color-warning': 'var(--orange-9)',
  },
  light: {
    '--mantine-color-body': 'var(--surface)',
  },
  dark: {
    '--mantine-color-body': 'var(--surface)',
  },
})

export default cssVariablesResolver
