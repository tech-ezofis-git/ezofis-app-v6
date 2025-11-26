import type { ReactNode } from 'react'
import AIChatBar from './components/AIChatBar'
import Sidebar from './components/sidebar/Sidebar'
import Topbar from './components/topbar/Topbar'

interface Props {
  children: ReactNode
}

const AppLayout = ({ children }: Props) => {
  return (
    <>
      <Sidebar />

      <div className='flex h-svh xl:ml-[53px]'>
        <div className='relative min-w-0 flex-1'>
          <Topbar />
          <div className='pb-20'>{children}</div>
        </div>

        <AIChatBar />
      </div>
    </>
  )
}

export default AppLayout
