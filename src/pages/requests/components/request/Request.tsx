import Drawer from '@/components/base/Drawer'
import OverlayContent from '@/components/base/overlay/OverlayContent'
import requestStore from '../../stores/useRequestStore'
import Footer from './components/Footer'
import Header from './components/Header'
import Sections from './components/sections/Sections'

const Request = () => {
  const isMaximized = requestStore((state) => state.isMaximized)
  const isRequestOpen = requestStore((state) => state.isRequestOpen)
  const closeRequest = requestStore((state) => state.closeRequest)

  return (
    <Drawer
      opened={isRequestOpen}
      width={isMaximized ? '100%' : '65%'}
      onClose={closeRequest}
    >
      <Header />
      <OverlayContent hasFooter hasHeader>
        <Sections />
      </OverlayContent>
      <Footer />
    </Drawer>
  )
}

Request.displayName = 'Request'
export default Request
