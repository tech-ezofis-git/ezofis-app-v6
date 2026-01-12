import { useLingui } from '@lingui/react/macro'
import { type MantineColorScheme, useMantineColorScheme } from '@mantine/core'

interface ColorSchemeOption {
  icon: string
  label: string
  value: MantineColorScheme
}

export default function useTheme() {
  const { t } = useLingui()

  const ColorSchemeOptions: ColorSchemeOption[] = [
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
