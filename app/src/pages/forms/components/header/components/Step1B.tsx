import Button from '@/components/base/button/Button'
import Title from '@/components/base/Title'
import useFormWizardStore from '@/pages/forms/stores/useFormWizardStore'
import AccordionLayout from './layouts/AccordionLayout'
import ClassicLayout from './layouts/ClassicLayout'
import StepperLayout from './layouts/StepperLayout'

const Step1B = () => {
  const formDetails = useFormWizardStore((state) => state.formDetails)
  const setFormDetails = useFormWizardStore((state) => state.setFormDetails)
  const setStep = useFormWizardStore((state) => state.setStep)

  return (
    <div className='flex flex-col items-center gap-10'>
      <div className='max-w-xl'>
        <Title
          description='Select how your form is displayed to users.'
          title='Choose Form Layout'
        />
      </div>

      <div className='flex flex-wrap justify-center gap-4'>
        <ClassicLayout
          selected={formDetails.layout === 'classic'}
          onClick={() => setFormDetails({ ...formDetails, layout: 'classic' })}
        />
        <StepperLayout
          selected={formDetails.layout === 'stepper'}
          onClick={() => setFormDetails({ ...formDetails, layout: 'stepper' })}
        />
        <AccordionLayout
          selected={formDetails.layout === 'accordion'}
          onClick={() =>
            setFormDetails({ ...formDetails, layout: 'accordion' })
          }
        />
      </div>

      <div className='flex w-full justify-between'>
        <Button
          color='gray'
          label='Back'
          variant='outline'
          onClick={() => setStep('1A')}
        />
        <Button disabled={!formDetails.layout} label='Create' />
      </div>
    </div>
  )
}

Step1B.displayName = 'Step1B'
export default Step1B
