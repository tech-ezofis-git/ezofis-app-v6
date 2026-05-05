import Button from '@/components/base/button/Button'
import Divider from '@/components/base/Divider'
// import WhatHappensNext from './components/WhatHappensNext'
import Title from '@/components/base/Title'
// import HeroText from '@/components/common/HeroText'
import setupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
import WorkflowPreview from './components/WorkflowPreview'

const StepFour = () => {
  const setStep = setupStore((state) => state.setStep)
  const setIsSetupStarted = setupStore((state) => state.setIsSetupStarted)
  const isApSetUpCompleted = setupStore((state) => state.isApSetUpCompleted)
  const apComplete = setupStore((state) => state.setisApSetUpCompleted)
  const handleClose = () => {
    apComplete(true)
    setIsSetupStarted(false)
  }
  return (
    <div className='flex min-h-full w-full flex-col gap-4 px-6 py-4 md:px-8'>
      <Title
        className='items-start text-left'
        description='Check your connections and confirm setup to activate AI-powered invoice automation.'
        level={1}
        title='Review & Complete Setup'
      />

      <Divider />
      <WorkflowPreview />
      {/* <WhatHappensNext /> */}

      <div className='flex flex-wrap items-center justify-between gap-2 border-t border-gray-3 pt-4'>
        <Button
          color='gray'
          icon='lucide:arrow-left'
          label='Back'
          variant='outline'
          onClick={() => setStep(2)}
        />
        <Button
          suffixIcon='tabler:arrow-right'
          label={
            isApSetUpCompleted ? 'Save Configuration' : 'Activate Automation'
          }
          onClick={handleClose}
        />
      </div>
    </div>
  )
}

StepFour.displayName = 'StepFour'
export default StepFour
