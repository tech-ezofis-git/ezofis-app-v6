import { THEME_STORAGE_KEY, type ResolvedTheme, type ThemeMode } from './constants'

export function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

export function getStoredThemeMode(): ThemeMode | null {
  if (typeof window === 'undefined') return null

  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'auto') {
      return stored
    }
  } catch {
    /* localStorage may be unavailable */
  }

  return null
}

export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === 'auto') return getSystemTheme()
  return mode
}

/** Apply resolved scheme to the document root (used by init script and ThemeSync). */
export function applyResolvedTheme(resolved: ResolvedTheme) {
  document.documentElement.setAttribute('data-mantine-color-scheme', resolved)
  document.documentElement.setAttribute('data-resolved-theme', resolved)
  document.documentElement.style.colorScheme = resolved
}
