import { Divider, Stack, Switch } from '@mantine/core'
import Input from '@/components/base/inputs/InputText'
import { useFormStore } from '@/pages/form-builder/store/formStore'

const WelcomePageSettings = () => {
  const { welcomePage, setWelcomePage } = useFormStore()

  return (
    <div className='animate-in fade-in flex-1 space-y-5 overflow-y-auto p-4 duration-500'>
      <Stack gap='xl'>
        <div className='flex items-center justify-between px-1 py-1'>
          <div className='text-sm font-bold text-gray-11'>
            Enable Welcome Page
          </div>
          <Switch
            checked={welcomePage.enabled}
            color='violet'
            onChange={(e) =>
              setWelcomePage({ enabled: e.currentTarget.checked })
            }
          />
        </div>
        <Divider className='border-gray-2' />
        <Input
          label='Welcome Title'
          placeholder='Welcome to our form'
          value={welcomePage.title}
          onChange={(val) => setWelcomePage({ title: val })}
        />
        <div>
          <label className='mb-2 block text-13 font-medium text-gray-11'>
            Description
          </label>
          <div className='relative'>
            <textarea
              className='min-h-[80px] w-full resize-none rounded-md border border-gray-6 bg-transparent px-3 py-2 text-13 font-medium text-gray-12 outline-none placeholder:font-normal placeholder:text-gray-8 focus:border-primary-8 focus:ring-2 focus:ring-primary-6'
              placeholder='Add a welcoming subtext...'
              value={welcomePage.description}
              onChange={(e) => setWelcomePage({ description: e.target.value })}
            />
          </div>
        </div>
        <Input
          label='Button Text'
          placeholder='Start'
          value={welcomePage.buttonText}
          onChange={(val) => setWelcomePage({ buttonText: val })}
        />
      </Stack>
    </div>
  )
}

export default WelcomePageSettings
