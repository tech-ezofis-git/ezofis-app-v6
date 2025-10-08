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

      <div className='flex h-svh overflow-hidden xl:ml-15'>
        <div className='flex-1'>
          <Topbar />
          {children}
        </div>

        <AIChatBar />
      </div>
    </>
  )
}

export default AppLayout
