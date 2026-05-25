import { Link, useLocation } from '@tanstack/react-router'
import type { Menu } from '@/layouts/app/types'
import Icon from '@/components/base/icon/Icon'
import Tooltip from '@/components/base/Tooltip'
import cn from '@/utils/cn'
import useSetupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'

interface Props extends Menu {
  iconClassName?: string
}

const MenuItem = ({ icon, iconClassName, label, route }: Props) => {
  const pathname = useLocation({
    select: (location) => location.pathname,
  })
  const isActive = pathname === route
  const isNavigationLocked = useSetupStore(
    (state) =>
      state.restrictNavigationUntilApSetup && !state.isApSetUpCompleted,
  )
  const isLinkDisabled = isNavigationLocked && route !== '/'

  return (
    <li key={label}>
      <Tooltip content={isLinkDisabled ? `${label} (locked)` : label} openDelay={500} position='right'>
        <Link
          to={route}
          tabIndex={isLinkDisabled ? -1 : undefined}
          className={cn(
            'group flex size-8 items-center justify-center rounded outline-0 transition-colors hover:bg-gray-2 focus-visible:bg-gray-2',
            isActive && 'bg-gray-3',
            isLinkDisabled && 'pointer-events-none opacity-40 cursor-not-allowed',
          )}
        >
          <Icon
            name={icon}
            className={cn(
              'transition-colors',
              isActive
                ? 'text-primary-11'
                : 'text-gray-11 group-hover:text-gray-12',
              iconClassName,
            )}
          />
        </Link>
      </Tooltip>
    </li>
  )
}

MenuItem.displayName = 'MenuItem'
export default MenuItem
