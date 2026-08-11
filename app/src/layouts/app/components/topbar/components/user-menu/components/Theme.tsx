import { useLingui } from '@lingui/react/macro'
import MenuItem from '@/components/base/menu/MenuItem'
import MenuSub from '@/components/base/menu/MenuSub'
import useTheme from '@/hooks/useTheme'

const Theme = () => {
  const { t } = useLingui()
  const { colorScheme, ColorSchemeOptions, handleColorSchemeChange } =
    useTheme()

  const labels: Record<string, string> = {
    auto: t`System`,
    dark: t`Dark`,
    light: t`Light`,
  }

  return (
    <MenuSub icon='lucide:sun-moon' label={t`Theme`}>
      {ColorSchemeOptions.map((option) => (
        <MenuItem
          icon={option.icon}
          key={option.value}
          label={labels[option.value] ?? option.label}
          iconClass={
            option.value === colorScheme ? 'text-primary-11' : 'text-gray-9'
          }
          onClick={handleColorSchemeChange(option.value)}
        />
      ))}
    </MenuSub>
  )
}

Theme.displayName = 'Theme'
export default Theme
