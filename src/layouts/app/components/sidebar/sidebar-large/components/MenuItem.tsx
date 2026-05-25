import { Link, useLocation } from '@tanstack/react-router'
import type { Menu } from '@/layouts/app/types'
import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'
import useSetupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'

interface Props extends Menu {
  iconClassName?: string
  onClick: () => void
}

const MenuItem = ({ icon, iconClassName, label, route, onClick }: Props) => {
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
    <li key={label} onClick={isLinkDisabled ? undefined : onClick}>
      <Link
        to={route}
        tabIndex={isLinkDisabled ? -1 : undefined}
        className={cn(
          'flex h-9 items-center gap-2 rounded px-2 font-medium text-gray-12 transition-colors hover:bg-gray-2 hover:text-gray-13 focus-visible:bg-gray-2 focus-visible:outline-0',
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

        <div className='leading-5'>{label}</div>
      </Link>
    </li>
  )
}

MenuItem.displayName = 'MenuItem'
export default MenuItem
