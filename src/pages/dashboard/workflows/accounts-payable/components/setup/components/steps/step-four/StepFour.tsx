import Button from '@/components/base/button/Button'
import Divider from '@/components/base/Divider'
import HeroText from '@/components/common/HeroText'
import setupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
import Integrations from './components/Integrations'
import WhatHappensNext from './components/WhatHappensNext'

const StepFour = () => {
  const setStep = setupStore((state) => state.setStep)
  const closeSetup = setupStore((state) => state.closeSetup)

  return (
    <div className='flex h-full max-w-max flex-col gap-10 p-6 xl:p-10'>
      <HeroText
        className='items-start text-left'
        description='Check your connections and confirm setup to activate AI-powered invoice automation.'
        title='Review & Complete Setup'
      />

      <Divider />
      <Integrations />
      <Divider />
      <WhatHappensNext />
      <Divider />

      <div className='flex flex-wrap items-center justify-between gap-2'>
        <Button
          color='gray'
          icon='tabler:arrow-left'
          label='Back'
          variant='outline'
          onClick={() => setStep(3)}
        />
        <Button
          label='Activate Automation'
          suffixIcon='tabler:arrow-right'
          onClick={closeSetup}
        />
      </div>
    </div>
  )
}

StepFour.displayName = 'StepFour'
export default StepFour
