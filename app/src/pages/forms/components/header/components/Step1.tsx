import Button from '@/components/base/button/Button'
import IconIllustrated from '@/components/base/icon/IconIllustrated'
import Title from '@/components/base/Title'
import useFormWizardStore from '@/pages/forms/stores/useFormWizardStore'
import cn from '@/utils/cn'

const Step1 = () => {
  const methods = [
    {
      description: 'Use drag & drop interface to build beautiful forms.',
      icon: 'lucide:blocks',
      step: '1A',
      title: 'Start from scratch',
      value: 'blank',
    },
    {
      description: 'Choose a template from our hand-crafted collection.',
      icon: 'lucide:template',
      step: '2',
      title: 'Use a template',
      value: 'template',
    },
    {
      description:
        'Let AI create a form with the right questions for your use case.',
      icon: 'mingcute:ai-line',
      step: '3',
      title: 'Start with AI',
      value: 'ai',
    },
  ]

  const formDetails = useFormWizardStore((state) => state.formDetails)
  const setFormDetails = useFormWizardStore((state) => state.setFormDetails)
  const setStep = useFormWizardStore((state) => state.setStep)

  const goToNextStep = () => {
    if (!formDetails.method) return
    const selectedMethod = methods.find(
      (method) => method.value === formDetails.method,
    )!
    setStep(selectedMethod.step)
  }

  return (
    <div className='flex flex-col items-center gap-10'>
      <div className='max-w-xl'>
        <Title
          description='Choose how you want to begin creating your form—start with a blank layout, pick from curated templates, or let AI generate a customized form for you.'
          title='Start Building Your Form'
        />
      </div>

      <div className='flex flex-wrap items-center justify-center gap-4'>
        {methods.map((method) => (
          <div
            key={method.title}
            className={cn(
              'group flex h-64 w-64 cursor-pointer flex-col items-center justify-center rounded border border-gray-3 p-6 text-center hover:bg-gray-2',
              formDetails.method === method.value && 'border-primary-9',
            )}
            onClick={() =>
              setFormDetails({ ...formDetails, method: method.value })
            }
          >
            <IconIllustrated icon={method.icon} />
            <div className='mt-4 mb-1 text-15 font-medium text-gray-13'>
              {method.title}
            </div>
            <p className='text-13/5 text-pretty text-gray-11'>
              {method.description}
            </p>
          </div>
        ))}
      </div>

      <Button
        disabled={!formDetails.method}
        label='Next'
        onClick={goToNextStep}
      />
    </div>
  )
}

Step1.displayName = 'Step1'
export default Step1
