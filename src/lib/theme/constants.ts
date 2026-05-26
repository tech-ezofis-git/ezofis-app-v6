import type { MantineColorScheme } from '@mantine/core'

/** Mantine localStorage key for the user's theme preference (auto | light | dark). */
export const THEME_STORAGE_KEY = 'mantine-color-scheme-value'

export const THEME_MODES = [
  'auto',
  'light',
  'dark',
] as const satisfies readonly MantineColorScheme[]

export type ResolvedTheme = 'light' | 'dark'

export type ThemeMode = (typeof THEME_MODES)[number]

export const DEFAULT_THEME_MODE: ThemeMode = 'auto'

/** Meta theme-color values for browser chrome (address bar, etc.). */
export const META_THEME_COLORS: Record<ResolvedTheme, string> = {
  dark: '#121113',
  light: '#7C5CFF',
}
