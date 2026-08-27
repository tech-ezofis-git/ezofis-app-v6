import {
  type ResolvedTheme,
  THEME_STORAGE_KEY,
  type ThemeMode,
} from './constants'

/** Apply resolved scheme to the document root (used by init script and ThemeSync). */
export function applyResolvedTheme(resolved: ResolvedTheme) {
  document.documentElement.setAttribute('data-mantine-color-scheme', resolved)
  document.documentElement.setAttribute('data-resolved-theme', resolved)
  if (resolved === 'dark') {
    document.documentElement.classList.add('dark')
    document.documentElement.classList.remove('light')
  } else {
    document.documentElement.classList.add('light')
    document.documentElement.classList.remove('dark')
  }
  document.documentElement.style.colorScheme = resolved

  // Swap custom color overrides from sessionStorage when theme changes
  try {
    const outgoing = resolved === 'dark' ? 'light' : 'dark'
    const incomingKey = `custom-color-preferences-${resolved}`
    const outgoingKey = `custom-color-preferences-${outgoing}`

    // Remove the outgoing theme's overrides from the DOM
    const incomingRaw =
      sessionStorage.getItem(incomingKey) || localStorage.getItem(incomingKey)
    const outgoingRaw =
      sessionStorage.getItem(outgoingKey) || localStorage.getItem(outgoingKey)
    if (outgoingRaw) {
      const outgoingOverrides: Record<string, string> = JSON.parse(outgoingRaw)
      Object.keys(outgoingOverrides).forEach((name) => {
        document.documentElement.style.removeProperty(name)
      })
    }

    // Apply the incoming theme's overrides to the DOM
    if (incomingRaw) {
      const incomingOverrides: Record<string, string> = JSON.parse(incomingRaw)
      Object.entries(incomingOverrides).forEach(([name, value]) => {
        document.documentElement.style.setProperty(name, value)
      })
    }
  } catch (_) {
    // sessionStorage unavailable or JSON parse error — skip silently
  }
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

export function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === 'auto') return getSystemTheme()
  return mode
}
