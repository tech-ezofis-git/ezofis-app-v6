import { useLingui } from '@lingui/react/macro'
import Badge from '@/components/base/Badge'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import Title from '@/components/base/Title'
import setupStore from '../../../../stores/useSetupStore'

const items = [
  {
    description:
      'Connect your email to automatically capture and extract invoice data with high accuracy.',
    features: [
      'Auto-detect incoming invoices',
      'Extract key invoice details',
      'Support for multiple file formats',
    ],
    icon: 'lucide:mail',
    id: 1,
    name: 'Email Integration',
  },
  {
    description:
      'Link your ERP system to sync data for purchase order matching and validation.',
    features: [
      'Real-time PO and invoice matching',
      'Automated data validation',
      'Built-in exception handling',
    ],
    icon: 'lucide:database',
    id: 2,
    name: 'ERP Integration',
  },
  {
    description:
      'Connect your document storage to securely organize, access, and manage invoices.',
    features: [
      'Smart file organization and matching',
      'Version control for documents',
      'Secure, centralized storage',
    ],
    icon: 'lucide:cloud',
    id: 3,
    name: 'Document Storage',
  },
]

const getFeatureJSX = (label: string) => {
  return (
    // <div className='flex items-center gap-2'>
    //   <Icon className='text-green-11' name='lucide:circle-check' />
    //   <span className='text-13/6 font-medium text-gray-12'>{label}</span>
    // </div>
    <Badge label={label} />
  )
}

const StepZero = () => {
  const setIsSetupStarted = setupStore((state) => state.setIsSetupStarted)
  const setStep = setupStore((state) => state.setStep)

  return (
    <div className='flex h-full max-w-max flex-col gap-6 p-6 xl:px-8'>
      <Title
        description={t`Get a quick overview of the setup process before connecting your tools.`}
        level={1}
        title={t`Welcome to AP Automation Setup`}
      />

      <div className='space-y-4'>
        {items.map((item) => (
          <div className='rounded border border-gray-3 p-4' key={item.id}>
            <div className='mb-4 flex gap-4 border-b border-gray-3 pb-4 xl:items-center'>
              <div className='flex size-10 items-center justify-center rounded bg-gray-3'>
                <Icon name={item.icon} />
              </div>
              <div className='flex-1 text-13/6'>
                <div className='font-semibold text-gray-13'>{item.name}</div>
                <div className='text-pretty'>{item.description}</div>
              </div>
            </div>

            <ul className='m-0 flex flex-wrap items-center gap-4 pl-14'>
              {item.features.map((feature) => (
                <li key={feature}>{getFeatureJSX(feature)}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className='flex flex-wrap items-center justify-between gap-2'>
        <Button
          color='gray'
          icon='lucide:arrow-left'
          label={t`Back`}
          variant='outline'
          onClick={() => setIsSetupStarted(false)}
        />
        <Button
          label={t`Continue`}
          suffixIcon='lucide:arrow-right'
          onClick={() => setStep(1)}
        />
      </div>
    </div>
  )
}

StepZero.displayName = 'StepZero'
export default StepZero
