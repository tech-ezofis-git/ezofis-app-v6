import Button from '@/components/base/button/Button'
import Modal from '@/components/base/Modal'
import OverlayContent from '@/components/base/overlay/OverlayContent'
import OverlayHeader from '@/components/base/overlay/OverlayHeader'
import useFormWizardStore from '@/pages/forms/stores/useFormWizardStore'
import Step1 from './Step1'
import Step1A from './Step1A'
import Step1B from './Step1B'
import Step3 from './Step3'

const FormWizard = () => {
  const isWizardOpen = useFormWizardStore((state) => state.isWizardOpen)
  const openWizard = useFormWizardStore((state) => state.openWizard)
  const closeWizard = useFormWizardStore((state) => state.closeWizard)
  const step = useFormWizardStore((state) => state.step)

  return (
    <>
      <Button icon='lucide:plus' label='New Form' onClick={openWizard} />

      <Modal opened={isWizardOpen} fullScreen onClose={closeWizard}>
        <OverlayHeader title='Create New Form' onClose={closeWizard} />
        <OverlayContent hasHeader>
          <div className='mx-auto flex min-h-full items-center justify-center p-10'>
            {step === '1' && <Step1 />}
            {step === '1A' && <Step1A />}
            {step === '1B' && <Step1B />}
            {step === '3' && <Step3 />}
          </div>
        </OverlayContent>
      </Modal>
    </>
  )
}

FormWizard.displayName = 'FormWizard'
export default FormWizard
