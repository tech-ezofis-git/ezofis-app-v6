import type { ReactNode } from 'react'
import AskAI from '@/components/common/ask-ai/AskAI'
import Sidebar from './components/sidebar/Sidebar'
import Topbar from './components/topbar/Topbar'

interface Props {
  children: ReactNode
}

const AppLayout = ({ children }: Props) => {
  return (
    <>
      <AskAI />
      <Sidebar />

      <div className='xl:ml-14.25'>
        <Topbar />
        <div className='pb-20'>{children}</div>
      </div>
    </>
  )
}

export default AppLayout
