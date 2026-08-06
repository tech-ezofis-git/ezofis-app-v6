import { useLingui } from '@lingui/react/macro'
import { Link, useLocation } from '@tanstack/react-router'
import type { Menu } from '@/layouts/app/types'
import Icon from '@/components/base/icon/Icon'
import Tooltip from '@/components/base/Tooltip'
import useRequestDemoStore from '@/layouts/app/stores/useRequestDemoStore'
import useSetupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
import { exitSetupToDashboard } from '@/pages/dashboard/workflows/setupPreview'
import cn from '@/utils/cn'

interface Props extends Menu {
  iconClassName?: string
}

const MenuItem = ({ icon, iconClassName, label, route }: Props) => {
  const { t } = useLingui()
  const pathname = useLocation({
    select: (location) => location.pathname,
  })
  const isDemoFormOpen = useRequestDemoStore((s) => s.isDemoFormOpen)
  const closeDemoForm = useRequestDemoStore((s) => s.closeDemoForm)
  const isActive = !isDemoFormOpen && pathname === route
  const isNavigationLocked = useSetupStore(
    (state) =>
      state.restrictNavigationUntilApSetup && !state.isApSetUpCompleted,
  )
  const isLinkDisabled = isNavigationLocked && route !== '/'

  return (
    <li key={label}>
      <Tooltip
        content={isLinkDisabled ? t`${label} (locked)` : label}
        openDelay={500}
        position='right'
      >
        <Link
          tabIndex={isLinkDisabled ? -1 : undefined}
          to={route}
          className={cn(
            'group flex size-8 items-center justify-center rounded outline-0 transition-colors hover:bg-gray-2 focus-visible:bg-gray-2',
            isActive && 'bg-gray-3',
            isLinkDisabled &&
              'pointer-events-none cursor-not-allowed opacity-40',
          )}
          onClick={() => {
            closeDemoForm()
            if (route === '/') {
              exitSetupToDashboard()
            }
          }}
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
