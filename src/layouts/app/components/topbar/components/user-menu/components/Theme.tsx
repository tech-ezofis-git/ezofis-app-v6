import MenuItem from '@/components/base/menu/MenuItem'
import MenuSub from '@/components/base/menu/MenuSub'
import useTheme from '@/hooks/useTheme'

const Theme = () => {
  const { colorScheme, ColorSchemeOptions, handleColorSchemeChange } =
    useTheme()

  return (
    <MenuSub icon='tabler:percentage-50' label='Theme'>
      {ColorSchemeOptions.map((option) => (
        <MenuItem
          icon={option.value === colorScheme ? option.activeIcon : option.icon}
          key={option.value}
          label={option.label}
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