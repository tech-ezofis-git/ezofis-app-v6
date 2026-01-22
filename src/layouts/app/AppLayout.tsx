import type { ReactNode } from 'react'
// import AskAI from '@/components/common/ask-ai/AskAI'
import Sidebar from './components/sidebar/Sidebar'
import Topbar from './components/topbar/Topbar'
import NewRequest from './components/NewRequest'
import requestStore from "../../pages/requests/stores/useRequestStore"

interface Props {
  children: ReactNode
}

const AppLayout = ({ children }: Props) => {
  const isNewRequestOpen = requestStore((state) => state.newRequest)

  return (
    <>
      {/* <AskAI /> */}
      <Sidebar />

      <div className='flex h-svh xl:ml-[53px] flex-col bg-[var(--gray-1)]'>
        {/* 1. Topbar is now outside the content logic, so it stays visible */}
        <Topbar />

        <div className='flex flex-1 min-h-0'>
          {/* 2. Hide children only when NewRequest is open */}
          {!isNewRequestOpen && (
            <div className='relative min-w-0 flex-1 overflow-hidden flex flex-col'>
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