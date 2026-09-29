import { Link, useLocation } from '@tanstack/react-router'
import type { Menu } from '@/layouts/app/types'
import Icon from '@/components/base/icon/Icon'
import useAskAIStore from '@/components/common/ask-ai/stores/useAskAIStore'
import useRequestDemoStore from '@/layouts/app/stores/useRequestDemoStore'
import useSetupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
import { exitSetupToDashboard } from '@/pages/dashboard/workflows/setupPreview'
import { clearOpenedFromSettings } from '@/pages/settings/helpers/settingsBreadcrumbs'
import { triggerResetFolderView } from '@/pages/folders/utils/folderExplorerSession'
import cn from '@/utils/cn'

interface Props extends Menu {
  iconClassName?: string
  onClick: () => void
}

const MenuItem = ({ icon, iconClassName, label, route, onClick }: Props) => {
  const pathname = useLocation({
    select: (location) => location.pathname,
  })
  const isDemoFormOpen = useRequestDemoStore((s) => s.isDemoFormOpen)
  const closeDemoForm = useRequestDemoStore((s) => s.closeDemoForm)
  const isAskAIMaximized = useAskAIStore((s) => s.isMaximized)
  const exitFullView = useAskAIStore((s) => s.exitFullView)
  const isActive =
    !isDemoFormOpen && !isAskAIMaximized && pathname === route
  const isNavigationLocked = useSetupStore(
    (state) =>
      state.restrictNavigationUntilApSetup && !state.isApSetUpCompleted,
  )
  const isLinkDisabled = isNavigationLocked && route !== '/'

  const handleClick = () => {
    // Close demo even when already on this route (pathname won't change).
    closeDemoForm()
    clearOpenedFromSettings()
    // Full-view AI: minimize to side panel so this menu can open + highlight
    if (isAskAIMaximized) {
      exitFullView()
    }
    if (route === '/') {
      exitSetupToDashboard()
    }
    if (route === '/folders') {
      triggerResetFolderView()
    }
    onClick()
  }

  return (
    <li key={label}>
      <Link
        tabIndex={isLinkDisabled ? -1 : undefined}
        to={route}
        className={cn(
          'flex h-9 items-center gap-2 rounded px-2 font-medium text-gray-12 transition-colors hover:bg-gray-2 hover:text-gray-13 focus-visible:bg-gray-2 focus-visible:outline-0',
          isActive && 'bg-gray-3',
          isLinkDisabled && 'pointer-events-none cursor-not-allowed opacity-40',
        )}
        onClick={isLinkDisabled ? undefined : handleClick}
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
