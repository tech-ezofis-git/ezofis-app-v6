import { Switch, Text, Divider, Stack } from '@mantine/core'
import { useFormStore } from '@/pages/form-builder/store/formStore'
import Input from '@/components/base/inputs/InputText'

const ThankYouPageSettings = () => {
  const { thankYouPage, setThankYouPage } = useFormStore()

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-5 animate-in fade-in duration-500">
      <Stack gap="xl">
        <div className="flex items-center justify-between py-1 px-1">
          <Text size="sm" fw={700} className="text-gray-11">Enable Thank You Page</Text>
          <Switch
            checked={thankYouPage.enabled}
            onChange={(e) => setThankYouPage({ enabled: e.currentTarget.checked })}
            color="violet"
          />
        </div>
        <Divider className="border-gray-2" />
        <Input
          label="Thank You Title"
          value={thankYouPage.title}
          onChange={(val) => setThankYouPage({ title: val })}
          placeholder="Thank you!"
        />
        <div>
          <label className='mb-2 block text-13 font-medium text-gray-11'>
            Completion Message
          </label>
          <div className='relative'>
            <textarea
              className='min-h-[80px] w-full resize-none rounded-md border border-gray-6 bg-transparent px-3 py-2 text-13 font-medium text-gray-12 outline-none placeholder:font-normal placeholder:text-gray-8 focus:border-primary-8 focus:ring-2 focus:ring-primary-6'
              value={thankYouPage.description}
              placeholder="Your submission has been received..."
              onChange={(e) => setThankYouPage({ description: e.target.value })}
            />
          </div>
        </div>
      </Stack>
    </div>
  )
}

export default ThankYouPageSettings
