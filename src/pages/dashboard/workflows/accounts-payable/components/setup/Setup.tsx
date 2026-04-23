import { FocusTrap } from '@mantine/core'
import Modal from '@/components/base/Modal'
import OverlayContent from '@/components/base/overlay/OverlayContent'
import OverlayHeader from '@/components/base/overlay/OverlayHeader'
import setupStore from '../../stores/useSetupStore'
import Steps from './components/Steps'
import WelcomeMessage from './components/WelcomeMessage'

const Setup = () => {
  const isSetupOpen = setupStore((state) => state.isSetupOpen)
  const closeSetup = setupStore((state) => state.closeSetup)

  return (
    <Modal opened={isSetupOpen} fullScreen onClose={closeSetup}>
      <FocusTrap.InitialFocus />
      <OverlayHeader
        title='Accounts Payable Setup'
        onClose={closeSetup}
      />

      <OverlayContent hasHeader>
        <WelcomeMessage />
        <Steps />
      </OverlayContent>
    </Modal>
  )
}

Setup.displayName = 'Setup'
export default Setup
