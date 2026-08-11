import { useMantineColorScheme } from '@mantine/core'
import { useEffect } from 'react'
import {
  META_THEME_COLORS,
  type ResolvedTheme,
  type ThemeMode,
} from './constants'
import { applyResolvedTheme, getSystemTheme } from './resolveTheme'

/**
 * Keeps document attributes and meta tags in sync with the active color scheme.
 * Complements MantineProvider for app-level theme hooks (data-resolved-theme, OS changes).
 */
export default function ThemeSync() {
  const { colorScheme } = useMantineColorScheme()

  useEffect(() => {
    const preference = colorScheme as ThemeMode
    const resolved: ResolvedTheme =
      preference === 'auto' ? getSystemTheme() : preference

    document.documentElement.setAttribute('data-theme-preference', preference)
    applyResolvedTheme(resolved)
    updateMetaThemeColor(resolved)
  }, [colorScheme])

  useEffect(() => {
    if (colorScheme !== 'auto') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const onSystemChange = () => {
      const resolved = getSystemTheme()
      applyResolvedTheme(resolved)
      updateMetaThemeColor(resolved)
    }

    mediaQuery.addEventListener('change', onSystemChange)
    return () => mediaQuery.removeEventListener('change', onSystemChange)
  }, [colorScheme])

  return null
}

function updateMetaThemeColor(resolved: ResolvedTheme) {
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.setAttribute('content', META_THEME_COLORS[resolved])
  }
}
