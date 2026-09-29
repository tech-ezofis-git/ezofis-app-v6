import { useLingui } from '@lingui/react/macro'
import { Link, useLocation } from '@tanstack/react-router'
import type { Menu } from '@/layouts/app/types'
import Icon from '@/components/base/icon/Icon'
import Tooltip from '@/components/base/Tooltip'
import useAskAIStore from '@/components/common/ask-ai/stores/useAskAIStore'
import useRequestDemoStore from '@/layouts/app/stores/useRequestDemoStore'
import useSetupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
import { exitSetupToDashboard } from '@/pages/dashboard/workflows/setupPreview'
import { clearOpenedFromSettings } from '@/pages/settings/helpers/settingsBreadcrumbs'
import { triggerResetFolderView } from '@/pages/folders/utils/folderExplorerSession'
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
  const isAskAIMaximized = useAskAIStore((s) => s.isMaximized)
  const exitFullView = useAskAIStore((s) => s.exitFullView)
  // While AI is full-view, don't highlight any sidebar menu.
  const isActive =
    !isDemoFormOpen && !isAskAIMaximized && pathname === route
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
