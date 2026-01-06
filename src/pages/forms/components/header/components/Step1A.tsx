import Button from '@/components/base/button/Button'
import InputRadioGroup from '@/components/base/inputs/InputRadioGroup'
import InputText from '@/components/base/inputs/InputText'
import InputTextarea from '@/components/base/inputs/InputTextarea'
import Title from '@/components/base/Title'
import useFormWizardStore from '@/pages/forms/stores/useFormWizardStore'

const Step1A = () => {
  const formDetails = useFormWizardStore((state) => state.formDetails)
  const setStep = useFormWizardStore((state) => state.setStep)
  const setFormDetails = useFormWizardStore((state) => state.setFormDetails)

  const options = [
    {
      description: 'Use this form in workflows',
      id: 1,
      name: 'Workflow Form',
    },
    {
      description: 'Use this form to collect master data',
      id: 2,
      name: 'Master Form',
    },
  ]

  return (
    <div className='flex flex-col items-center gap-10'>
      <div className='max-w-xl'>
        <Title
          description='Add a name and short description to identify and manage your form.'
          title='Name Your Form'
        />
      </div>

      <div className='w-full max-w-xl space-y-6'>
        <InputText
          label='Name'
          placeholder='e.g. Customer Feedback Survey'
          value={formDetails.name}
          required
          onChange={(value) => setFormDetails({ ...formDetails, name: value })}
        />

        <InputTextarea
          label='Description'
          placeholder='e.g. This survey is used to collect feedback on our products and services.'
          value={formDetails.description}
          onChange={(value) =>
            setFormDetails({ ...formDetails, description: value })
          }
        />

        <InputRadioGroup
          label='Type'
          options={options}
          value={formDetails.type}
          onChange={(value) => setFormDetails({ ...formDetails, type: value })}
        />

        <div className='flex justify-between border-t border-gray-3 pt-4'>
          <Button
            color='gray'
            label='Back'
            variant='outline'
            onClick={() => setStep('1')}
          />
          <Button
            disabled={!formDetails.name}
            label='Next'
            onClick={() => setStep('1B')}
          />
        </div>
      </div>
    </div>
  )
}

Step1A.displayName = 'Step1A'
export default Step1A
