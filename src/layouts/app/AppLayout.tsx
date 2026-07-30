import type { ReactNode } from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import authApi from '@/api/auth'
import AskAI from '@/components/common/ask-ai/AskAI'
import useAskAIStore from '@/components/common/ask-ai/stores/useAskAIStore'
import useSetupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
import { useIsMobile } from '@/pages/mobile'
import requestStore from '../../pages/requests/stores/useRequestStore'
import NewRequest from './components/NewRequest'
import RequestDemoForm from './components/RequestDemoForm'
import Sidebar from './components/sidebar/Sidebar'
import Topbar from './components/topbar/Topbar'
import useRequestDemoStore from './stores/useRequestDemoStore'

interface Props {
  children: ReactNode
}

const AI_PANEL_WIDTH = 420

const AppLayout = ({ children }: Props) => {
  const isNewRequestOpen = requestStore((state) => state.newRequest)
  const closeNewRequest = requestStore((state) => state.closeNewRequest)
  const isAskAIOpen = useAskAIStore((state) => state.isOpen)
  const isDemoFormOpen = useRequestDemoStore((s) => s.isDemoFormOpen)
  const closeDemoForm = useRequestDemoStore((s) => s.closeDemoForm)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const isApSetUpCompleted = useSetupStore((state) => state.isApSetUpCompleted)
  const restrictNavigationUntilApSetup = useSetupStore(
    (state) => state.restrictNavigationUntilApSetup,
  )
  const isMobile = useIsMobile()

  useEffect(() => {
    if (isNewRequestOpen) {
      closeNewRequest()
    }
    if (isDemoFormOpen) {
      closeDemoForm()
    }
  }, [pathname, closeNewRequest, closeDemoForm])

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await authApi.getSession()
        // Incomplete AP setup → keep user on dashboard setup flow.
        // Do not redirect completed users to /requests on refresh — stay on current page.
        if (res?.data?.configuration === 0) {
          useSetupStore.getState().setIsSetupStarted(true)
          useSetupStore.getState().setisApSetUpCompleted(false)
          if (pathname !== '/') {
            navigate({ replace: true, to: '/' })
          }
        }
      } catch (err) {
        console.error('Failed to fetch session on app layout mount:', err)
      }
    }
    fetchSession()
    // Intentionally mount-only; pathname is read for incomplete-setup redirect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (
      restrictNavigationUntilApSetup &&
      !isApSetUpCompleted &&
      pathname !== '/'
    ) {
      navigate({ replace: true, to: '/' })
    }
  }, [isApSetUpCompleted, restrictNavigationUntilApSetup, pathname, navigate])

  if (isMobile) {
    return (
      <div className='flex min-h-dvh flex-col bg-surface-secondary'>
        <div className='flex h-dvh min-h-0 flex-1 flex-col overflow-hidden'>
          {children}
        </div>
      </div>
    )
  }

  return (
    <>
      <Sidebar />

      <div
        className='flex h-svh flex-col transition-[margin-right] duration-200 xl:ml-[56px]'
        style={{
          marginRight: isAskAIOpen ? AI_PANEL_WIDTH : 0,
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
    </>
  )
}

export default AppLayout
