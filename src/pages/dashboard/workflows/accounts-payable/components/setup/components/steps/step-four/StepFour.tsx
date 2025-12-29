import Button from '@/components/base/button/Button'
import Divider from '@/components/base/Divider'
import HeroText from '@/components/common/HeroText'
import setupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
import Integrations from './components/Integrations'
import WhatHappensNext from './components/WhatHappensNext'

const StepFour = () => {
  const setStep = setupStore((state) => state.setStep)
  const setIsSetupStarted = setupStore((state) => state.setIsSetupStarted)
  const apComplete = setupStore((state) => state.setisApSetUpCompleted)
  const handleClose = () => {
    apComplete(true)
    setIsSetupStarted(false)
  }
  return (
    <div className='flex min-h-full w-full flex-col gap-6 px-4 py-6 sm:px-6 md:px-8 lg:px-10'>
      <HeroText
        className='items-start text-left'
        description='Check your connections and confirm setup to activate AI-powered invoice automation.'
        title='Review & Complete Setup'
      />

      <Divider />
      <Integrations />
      <Divider />
      <WhatHappensNext />

      <div className='flex flex-wrap items-center justify-between gap-2 border-t border-gray-3 pt-4'>
        <Button
          color='gray'
          icon='tabler:arrow-left'
          label='Back'
          variant='outline'
          onClick={() => setStep(2)}
        />
        <Button
          label='Activate Automation'
          suffixIcon='tabler:arrow-right'
          onClick={handleClose}
        />
      </div>
    </div>
  )
}

StepFour.displayName = 'StepFour'
export default StepFour