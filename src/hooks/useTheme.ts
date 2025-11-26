import { useLingui } from '@lingui/react/macro'
import { type MantineColorScheme, useMantineColorScheme } from '@mantine/core'

interface ColorSchemeOption {
  activeIcon: string
  icon: string
  label: string
  value: MantineColorScheme
}

export default function useTheme() {
  const { t } = useLingui()

  const ColorSchemeOptions: ColorSchemeOption[] = [
    {
      activeIcon: 'tabler:device-desktop-filled',
      icon: 'tabler:device-desktop',
      label: t`System`,
      value: 'auto',
    },
    {
      activeIcon: 'tabler:sun-high-filled',
      icon: 'tabler:sun-high',
      label: t`Light`,
      value: 'light',
    },
    {
      activeIcon: 'tabler:moon-filled',
      icon: 'tabler:moon',
      label: t`Dark`,
      value: 'dark',
    },
  ]

  const { colorScheme, setColorScheme } = useMantineColorScheme()

  const handleColorSchemeChange = (value: MantineColorScheme) => () =>
    setColorScheme(value)

  const selectedColorScheme = ColorSchemeOptions.find(
    ({ value }) => value === colorScheme,
  )!

  return {
    colorScheme,
    ColorSchemeOptions,
    handleColorSchemeChange,
    selectedColorScheme,
  }
}
