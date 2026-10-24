import { useLingui } from '@lingui/react/macro'
import Button from '@/components/base/button/Button'
import InfoCard from '@/components/base/InfoCard'
import Modal from '@/components/base/Modal'
import OverlayContent from '@/components/base/overlay/OverlayContent'
import OverlayHeader from '@/components/base/overlay/OverlayHeader'
import { FORM_WIZARD_GUIDES } from '@/constants/pageGuides'
import useFormWizardStore from '@/pages/forms/stores/useFormWizardStore'
import Step1 from './Step1'
import Step1A from './Step1A'
import Step1B from './Step1B'
import Step3 from './Step3'

const FormWizard = () => {
  const { i18n } = useLingui()
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
          <div className='mx-auto flex min-h-full max-w-3xl flex-col gap-4 p-10'>
            {FORM_WIZARD_GUIDES[step] ? (
              <InfoCard
                description={i18n._(FORM_WIZARD_GUIDES[step].description)}
                key={step}
                title={i18n._(FORM_WIZARD_GUIDES[step].title)}
                showVideo
              />
            ) : null}
            <div className='flex flex-1 items-center justify-center'>
              {step === '1' && <Step1 />}
              {step === '1A' && <Step1A />}
              {step === '1B' && <Step1B />}
              {step === '3' && <Step3 />}
            </div>
          </div>
        </OverlayContent>
      </Modal>
    </>
  )
}

FormWizard.displayName = 'FormWizard'
export default FormWizard
