import type { ReactNode } from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import authApi from '@/api/auth'
import AskAI from '@/components/common/ask-ai/AskAI'
import useAskAIStore from '@/components/common/ask-ai/stores/useAskAIStore'
import ApiPlaygroundPanel from '@/components/playground/ApiPlaygroundPanel'
import BrandingSync from '@/lib/branding/BrandingSync'
import { resolveSignInPath } from '@/lib/branding/session'
import useSetupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
import { clearAskAiFolderExplorerQuery } from '@/pages/folders/utils/folderExplorerSession'
import { useIsMobile } from '@/pages/mobile'
import authUserStore from '@/stores/authUserStore'
import useGeoStore from '@/stores/useGeoStore'
import usePlaygroundStore from '@/stores/usePlaygroundStore'
import requestStore from '../../pages/requests/stores/useRequestStore'
import NewRequest from './components/NewRequest'
import RequestDemoForm from './components/RequestDemoForm'
import Sidebar from './components/sidebar/Sidebar'
import Topbar from './components/topbar/Topbar'
import useRequestDemoStore from './stores/useRequestDemoStore'

interface Props {
  children: ReactNode
}

const SIDE_PANEL_WIDTH = 420

const AppLayout = ({ children }: Props) => {
  const isNewRequestOpen = requestStore((state) => state.newRequest)
  const closeNewRequest = requestStore((state) => state.closeNewRequest)
  const isAskAIOpen = useAskAIStore((state) => state.isOpen)
  const isAskAIMaximized = useAskAIStore((state: any) => state.isMaximized)
  const isPlaygroundOpen = usePlaygroundStore((state) => state.isOpen)
  const isDemoFormOpen = useRequestDemoStore((s) => s.isDemoFormOpen)
  const closeDemoForm = useRequestDemoStore((s) => s.closeDemoForm)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const isApSetUpCompleted = useSetupStore((state) => state.isApSetUpCompleted)
  const restrictNavigationUntilApSetup = useSetupStore(
    (state) => state.restrictNavigationUntilApSetup,
  )
  const isAuthenticated = authUserStore((state) => state.isAuthenticated)
  const isMobile = useIsMobile()
  const prevPathRef = useRef(pathname)

  useEffect(() => {
    const prev = prevPathRef.current
    if (prev.startsWith('/folders') && !pathname.startsWith('/folders')) {
      clearAskAiFolderExplorerQuery()
    }
    prevPathRef.current = pathname
  }, [pathname])

  useEffect(() => {
    if (isNewRequestOpen) {
      closeNewRequest()
    }
    if (isDemoFormOpen) {
      closeDemoForm()
    }
  }, [pathname, closeNewRequest, closeDemoForm])

  useEffect(() => {
    useGeoStore.getState().fetchLocation()
  }, [])

  useEffect(() => {
    if (!authUserStore.getState().isAuthenticated) return

    const applyIncompleteSetup = (configuration: unknown) => {
      if (String(configuration) === '0') {
        useSetupStore.getState().setIsSetupStarted(true)
        useSetupStore.getState().setisApSetUpCompleted(false)
        if (pathname !== '/') {
          navigate({ replace: true, to: '/' })
        }
      }
    }

    const fetchSession = async () => {
      try {
        // Gated: runs on browser refresh; skipped if sign-in already loaded session
        const res = await authApi.getSession()
        applyIncompleteSetup(
          res?.data?.configuration ??
            authUserStore.getState().session?.configuration,
        )
      } catch (err) {
        console.error('Failed to fetch session on app layout mount:', err)
      }
    }
    fetchSession()
    // Mount-only (browser refresh). Sign-in already calls userSession before entering the app.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      const signInPath = resolveSignInPath()
      navigate({ replace: true, to: signInPath })
      return
    }
    if (
      restrictNavigationUntilApSetup &&
      !isApSetUpCompleted &&
      pathname !== '/'
    ) {
      navigate({ replace: true, to: '/' })
    }
  }, [
    isAuthenticated,
    isApSetUpCompleted,
    restrictNavigationUntilApSetup,
    pathname,
    navigate,
  ])

  if (isMobile) {
    return (
      <div className='flex min-h-dvh flex-col bg-surface-secondary'>
        <BrandingSync />
        <div className='flex h-dvh min-h-0 flex-1 flex-col overflow-hidden'>
          {children}
        </div>
      </div>
    )
  }

  return (
    <>
      <BrandingSync />
      <Sidebar />

      <div
        className='flex h-svh flex-col transition-[margin-right] duration-200 xl:ml-[56px]'
        style={{
          marginRight:
            (isAskAIOpen && !isAskAIMaximized) || isPlaygroundOpen
              ? SIDE_PANEL_WIDTH
              : 0,
        }}
      >
        <Topbar />

        <div className='flex min-h-0 flex-1 bg-[var(--gray-1)]'>
          {!isNewRequestOpen && !isDemoFormOpen && (
            <div className='relative flex min-w-0 flex-1 flex-col overflow-hidden'>
              {children}
            </div>
          )}

          {isNewRequestOpen && <NewRequest />}
          {isDemoFormOpen && <RequestDemoForm />}
        </div>
      </div>
      <AskAI />
      <ApiPlaygroundPanel />
    </>
  )
}

export default AppLayout
