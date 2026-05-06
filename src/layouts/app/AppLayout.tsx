import { useEffect } from 'react'
import { useLocation } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import requestStore from '../../pages/requests/stores/useRequestStore'

import NewRequest from './components/NewRequest'
// import AskAI from '@/components/common/ask-ai/AskAI'
import Sidebar from './components/sidebar/Sidebar'
import Topbar from './components/topbar/Topbar'

interface Props {
  children: ReactNode
}

const AppLayout = ({ children }: Props) => {
  const isNewRequestOpen = requestStore((state) => state.newRequest)
  const closeNewRequest = requestStore((state) => state.closeNewRequest)
  const { pathname } = useLocation()

  // Close New Request overlay when the route changes
  useEffect(() => {
    if (isNewRequestOpen) {
      closeNewRequest()
    }
  }, [pathname, closeNewRequest])

  return (
    <>
      {/* <AskAI /> */}
      <Sidebar />

      <div className='flex h-svh flex-col bg-[var(--gray-1)] xl:ml-[56px]'>
        {/* 1. Topbar is now outside the content logic, so it stays visible */}
        <Topbar />

        <div className='flex min-h-0 flex-1'>
          {/* 2. Hide children only when NewRequest is open */}
          {!isNewRequestOpen && (
            <div className='relative flex min-w-0 flex-1 flex-col overflow-hidden'>
              {children}
            </div>
          )}

          {/* 3. NewRequest component */}
          {isNewRequestOpen && <NewRequest />}
        </div>
      </div>
    </>
  )
}

export default AppLayout
