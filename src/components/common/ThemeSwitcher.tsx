import { type MantineColorScheme, useMantineColorScheme } from '@mantine/core'
import { useState } from 'react'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import Menu from '@/components/base/menu/Menu'
import MenuItem from '@/components/base/menu/MenuItem'
import MenuLabel from '@/components/base/menu/MenuLabel'
import Tooltip from '@/components/base/Tooltip'
import { TOOLTIP_DELAY } from '@/constants'

interface ColorSchemeOption {
  activeIcon: string
  icon: string
  label: string
  value: MantineColorScheme
}

interface Props {
  withLabel?: boolean
}

const ColorSchemeOptions: ColorSchemeOption[] = [
  {
    activeIcon: 'tabler:device-desktop-filled',
    icon: 'tabler:device-desktop',
    label: 'System',
    value: 'auto',
  },
  {
    activeIcon: 'tabler:sun-high-filled',
    icon: 'tabler:sun-high',
    label: 'Light',
    value: 'light',
  },
  {
    activeIcon: 'tabler:moon-filled',
    icon: 'tabler:moon',
    label: 'Dark',
    value: 'dark',
  },
]

const ThemeSwitcher = ({ withLabel = false }: Props) => {
  const { colorScheme, setColorScheme } = useMantineColorScheme()
  const [isMenuOpened, setIsMenuOpened] = useState(false)

  const menuTrigger = withLabel ? (
    <Button
      className='w-full gap-3 px-2'
      color='gray'
      icon='tabler:percentage-50'
      iconClass='m-0'
      label='Change Theme'
      variant='ghost'
    />
  ) : (
    <Tooltip
      content='Change theme'
      disabled={isMenuOpened}
      openDelay={TOOLTIP_DELAY}
    >
      <IconButton
        ariaLabel='Change theme'
        color='gray'
        icon='tabler:percentage-50'
        variant='ghost'
      />
    </Tooltip>
  )

  const handleColorSchemeChange = (value: MantineColorScheme) => () =>
    setColorScheme(value)

  const handleOnChange = (isOpened: boolean) => setIsMenuOpened(isOpened)

  return (
    <Menu
      aria-label='Theme options'
      position='right-end'
      target={menuTrigger}
      width={144}
      onChange={handleOnChange}
    >
      <MenuLabel>Change Theme</MenuLabel>
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
    </Menu>
  )
}

export default ThemeSwitcher
