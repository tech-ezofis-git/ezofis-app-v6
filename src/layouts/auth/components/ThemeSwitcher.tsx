import { Trans, useLingui } from '@lingui/react/macro'
import { useState } from 'react'
import IconButton from '@/components/base/button/IconButton'
import Menu from '@/components/base/menu/Menu'
import MenuItem from '@/components/base/menu/MenuItem'
import MenuLabel from '@/components/base/menu/MenuLabel'
import Tooltip from '@/components/base/Tooltip'
import useTheme from '@/hooks/useTheme'

const ThemeSwitcher = () => {
  const { t } = useLingui()
  const { colorScheme, ColorSchemeOptions, handleColorSchemeChange } =
    useTheme()

  const [isMenuOpened, setIsMenuOpened] = useState(false)

  const menuTrigger = (
    <Tooltip content={t`Change theme`} disabled={isMenuOpened} openDelay={500}>
      <IconButton
        ariaLabel='Change theme'
        color='gray'
        icon='lucide:sun-moon'
        variant='ghost'
      />
    </Tooltip>
  )

  const handleOnChange = (isOpened: boolean) => setIsMenuOpened(isOpened)

  return (
    <Menu
      aria-label='Theme options'
      position='right-end'
      target={menuTrigger}
      width={144}
      onChange={handleOnChange}
    >
      <MenuLabel>
        <Trans>Change Theme</Trans>
      </MenuLabel>
      {ColorSchemeOptions.map((option) => (
        <MenuItem
          icon={option.icon}
          key={option.value}
          label={option.label}
          iconClass={
            option.value === colorScheme ? 'text-primary-11' : 'text-gray-9'
          }
          onClick={handleColorSchemeChange(option.value)}
        />
      ))}
    </Menu>
  )
}

export default ThemeSwitcher
