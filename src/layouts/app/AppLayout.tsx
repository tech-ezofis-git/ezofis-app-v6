import type { ReactNode } from 'react'
import { useLocation } from '@tanstack/react-router'
import { useEffect } from 'react'
import authApi from '@/api/auth'
import AskAI from '@/components/common/ask-ai/AskAI'
import useAskAIStore from '@/components/common/ask-ai/stores/useAskAIStore'
import requestStore from '../../pages/requests/stores/useRequestStore'
import NewRequest from './components/NewRequest'
import Sidebar from './components/sidebar/Sidebar'
import Topbar from './components/topbar/Topbar'

interface Props {
  children: ReactNode
}

const AI_PANEL_WIDTH = 420

const AppLayout = ({ children }: Props) => {
  const isNewRequestOpen = requestStore((state) => state.newRequest)
  const closeNewRequest = requestStore((state) => state.closeNewRequest)
  const isAskAIOpen = useAskAIStore((state) => state.isOpen)
  const { pathname } = useLocation()

  useEffect(() => {
    if (isNewRequestOpen) {
      closeNewRequest()
    }
  }, [pathname, closeNewRequest])

  useEffect(() => {
    const fetchSession = async () => {
      try {
        await authApi.getSession()
      } catch (err) {
        console.error('Failed to fetch session on app layout mount:', err)
      }
    }
    fetchSession()
  }, [])

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
          {!isNewRequestOpen && (
            <div className='relative flex min-w-0 flex-1 flex-col overflow-hidden'>
              {children}
            </div>
          )}

          {isNewRequestOpen && <NewRequest />}
        </div>
      </div>
      <AskAI />
    </>
  )
}

export default AppLayout
