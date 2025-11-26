import { Trans, useLingui } from '@lingui/react/macro'
import { useState } from 'react'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import Menu from '@/components/base/menu/Menu'
import MenuItem from '@/components/base/menu/MenuItem'
import MenuLabel from '@/components/base/menu/MenuLabel'
import Tooltip from '@/components/base/Tooltip'
import { TOOLTIP_DELAY } from '@/constants'
import useTheme from '@/hooks/useTheme'

interface Props {
  withLabel?: boolean
}

const ThemeSwitcher = ({ withLabel = false }: Props) => {
  const { t } = useLingui()
  const { colorScheme, ColorSchemeOptions, handleColorSchemeChange } =
    useTheme()

  const [isMenuOpened, setIsMenuOpened] = useState(false)

  const menuTrigger = withLabel ? (
    <Button
      className='w-full gap-3 px-2'
      color='gray'
      icon='tabler:percentage-50'
      iconClass='m-0'
      label={t`Change Theme`}
      variant='ghost'
    />
  ) : (
    <Tooltip
      content={t`Change theme`}
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
