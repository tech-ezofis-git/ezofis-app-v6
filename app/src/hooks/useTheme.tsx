import { useLingui } from '@lingui/react/macro'
import { type MantineColorScheme, useMantineColorScheme } from '@mantine/core'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  applyResolvedTheme,
  getSystemTheme,
  type ResolvedTheme,
  resolveTheme,
  type ThemeMode,
} from '@/lib/theme'

interface ColorSchemeOption {
  icon: string
  label: string
  value: MantineColorScheme
}

export default function useTheme() {
  const { t } = useLingui()
  const { clearColorScheme, colorScheme, setColorScheme } =
    useMantineColorScheme()

  const [resolvedColorScheme, setResolvedColorScheme] = useState<ResolvedTheme>(
    () => resolveTheme(colorScheme as ThemeMode),
  )

  const ColorSchemeOptions: ColorSchemeOption[] = useMemo(
    () => [
      {
        icon: 'lucide:monitor',
        label: t`System`,
        value: 'auto',
      },
      {
        icon: 'lucide:sun',
        label: t`Light`,
        value: 'light',
      },
      {
        icon: 'lucide:moon',
        label: t`Dark`,
        value: 'dark',
      },
    ],
    [t],
  )

  const syncResolvedScheme = useCallback(() => {
    setResolvedColorScheme(resolveTheme(colorScheme as ThemeMode))
  }, [colorScheme])

  useEffect(() => {
    syncResolvedScheme()
  }, [syncResolvedScheme])

  useEffect(() => {
    if (colorScheme !== 'auto') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => syncResolvedScheme()

    mediaQuery.addEventListener('change', onChange)
    return () => mediaQuery.removeEventListener('change', onChange)
  }, [colorScheme, syncResolvedScheme])

  const handleColorSchemeChange = (value: MantineColorScheme) => () => {
    const resolved: ResolvedTheme =
      value === 'auto' ? getSystemTheme() : (value as ResolvedTheme)
    applyResolvedTheme(resolved)
    setColorScheme(value)
    setResolvedColorScheme(resolved)
  }

  const selectedColorScheme = ColorSchemeOptions.find(
    ({ value }) => value === colorScheme,
  )!

  const isDark = resolvedColorScheme === 'dark'
  const isLight = resolvedColorScheme === 'light'
  const isSystem = colorScheme === 'auto'

  return {
    clearColorScheme,
    colorScheme,
    ColorSchemeOptions,
    handleColorSchemeChange,
    isDark,
    isLight,
    isSystem,
    resolvedColorScheme,
    selectedColorScheme,
    setColorScheme,
  }
}
