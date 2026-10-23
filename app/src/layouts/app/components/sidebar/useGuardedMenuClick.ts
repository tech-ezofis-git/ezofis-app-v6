import type { MouseEvent } from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import type { Menu } from '@/layouts/app/types'
import { resetSettingsView } from '@/pages/settings/helpers/settingsNavigation'
import useLeaveGuardStore from '@/stores/useLeaveGuardStore'

/**
 * Sidebar menu click with the unsaved-changes guard: when a builder has
 * unsaved changes the navigation waits for the LeaveGuardDialog. Re-clicking
 * Settings while on Settings returns to the main settings menu.
 */
const useGuardedMenuClick = (route: Menu['route']) => {
  const navigate = useNavigate()
  const pathname = useLocation({
    select: (location) => location.pathname,
  })

  return (event: MouseEvent, sideEffects: () => void) => {
    const isSettingsReclick = route === '/settings' && pathname === '/settings'
    const run = () => {
      sideEffects()
      if (isSettingsReclick) resetSettingsView()
    }

    const { guard, requestLeave } = useLeaveGuardStore.getState()
    if (!guard || guard.getChangeCount() <= 0) {
      run()
      return
    }

    event.preventDefault()
    requestLeave(() => {
      run()
      if (!isSettingsReclick) void navigate({ to: route })
    })
  }
}

export default useGuardedMenuClick
