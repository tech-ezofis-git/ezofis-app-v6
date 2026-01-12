import Button from '@/components/base/button/Button'
import InputLabel from '@/components/base/inputs/InputLabel'
import InputTextarea from '@/components/base/inputs/InputTextarea'
import Title from '@/components/base/Title'
import useFormWizardStore from '@/pages/forms/stores/useFormWizardStore'

const Step3 = () => {
  const prompt = useFormWizardStore((state) => state.prompt)
  const setPropmt = useFormWizardStore((state) => state.setPropmt)
  const setStep = useFormWizardStore((state) => state.setStep)

  const prompts = [
    {
      name: 'Customer Feedback',
      value:
        'Create a customer feedback form for an e-commerce website using a clean, pastel theme.',
    },
    {
      name: 'Contact Us',
      value:
        'Create a contact form for a company website with fields for name, email, subject, and message.',
    },
    {
      name: 'Lead Capture',
      value:
        'Create a lead generation form for a SaaS product including name, work email, company, role, and use case.',
    },
    {
      name: 'Event Registration',
      value:
        'Create an event registration form with attendee details, session selection, and dietary preferences.',
    },
    {
      name: 'Job Application',
      value:
        'Create a job application form with personal details, role selection, resume upload, and availability.',
    },
    {
      name: 'Product Survey',
      value:
        'Create a product survey form with rating scales, multiple-choice questions, and optional comments.',
    },
    {
      name: 'Newsletter Signup',
      value:
        'Create a newsletter signup form with email subscription preferences and consent checkbox.',
    },
    {
      name: 'Support Request',
      value:
        'Create a customer support request form with issue category, priority level, and detailed description.',
    },
    {
      name: 'Appointment Booking',
      value:
        'Create an appointment booking form with date selection, time slots, and contact information.',
    },
    {
      name: 'Order Cancellation',
      value:
        'Create an order cancellation form with order ID, cancellation reason, and refund preference.',
    },
  ]

  return (
    <div className='flex flex-col items-center gap-10'>
      <div className='max-w-xl'>
        <Title
          description='Automatically generate smart, customizable forms using AI.'
          title='Create Form with AI'
        />
      </div>

      <div className='w-full max-w-xl space-y-6'>
        <InputTextarea
          label='Describe your form'
          maxRows={10}
          minRows={5}
          placeholder='e.g. I want to build a registration form for student events'
          value={prompt}
          autosize
          onChange={(value) => setPropmt(value)}
        />

        <div>
          <InputLabel label='Or create using our Prompts:' />
          <div className='mt-2 flex flex-wrap items-center gap-2'>
            {prompts.map((prompt) => (
              <Button
                color='gray'
                key={prompt.name}
                label={prompt.name}
                variant='outline'
                onClick={() => setPropmt(prompt.value)}
              />
            ))}
          </div>
        </div>

        <div className='flex justify-between border-t border-gray-3 pt-4'>
          <Button
            color='gray'
            label='Back'
            variant='outline'
            onClick={() => setStep('1')}
          />
          <Button label='Generate' />
        </div>
      </div>
    </div>
  )
}

Step3.displayName = 'Step3'
export default Step3
