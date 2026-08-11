import { Divider, Stack, Switch } from '@mantine/core'
import Input from '@/components/base/inputs/InputText'
import { useFormStore } from '@/pages/form-builder/store/formStore'

const ThankYouPageSettings = () => {
  const { thankYouPage, setThankYouPage } = useFormStore()

  return (
    <div className='animate-in fade-in flex-1 space-y-5 overflow-y-auto p-4 duration-500'>
      <Stack gap='xl'>
        <div className='flex items-center justify-between px-1 py-1'>
          <div className='text-sm font-bold text-gray-11'>
            Enable Thank You Page
          </div>
          <Switch
            checked={thankYouPage.enabled}
            color='violet'
            onChange={(e) =>
              setThankYouPage({ enabled: e.currentTarget.checked })
            }
          />
        </div>
        <Divider className='border-gray-2' />
        <Input
          label='Thank You Title'
          placeholder='Thank you!'
          value={thankYouPage.title}
          onChange={(val) => setThankYouPage({ title: val })}
        />
        <div>
          <label className='mb-2 block text-13 font-medium text-gray-11'>
            Completion Message
          </label>
          <div className='relative'>
            <textarea
              className='min-h-[80px] w-full resize-none rounded-md border border-gray-6 bg-transparent px-3 py-2 text-13 font-medium text-gray-12 outline-none placeholder:font-normal placeholder:text-gray-8 focus:border-primary-8 focus:ring-2 focus:ring-primary-6'
              placeholder='Your submission has been received...'
              value={thankYouPage.description}
              onChange={(e) => setThankYouPage({ description: e.target.value })}
            />
          </div>
        </div>
      </Stack>
    </div>
  )
}

export default ThankYouPageSettings
