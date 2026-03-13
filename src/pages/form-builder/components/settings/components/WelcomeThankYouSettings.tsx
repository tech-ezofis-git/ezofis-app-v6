import {
  Box,
  Group,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core'
import Icon from '@/components/base/icon/Icon'
import { useFormStore } from '@/pages/form-builder/store/formStore'

interface Props {
  type: 'welcome' | 'thank_you'
}

const WelcomeThankYouSettings = ({ type }: Props) => {
  const { thankYouPage, welcomePage, setThankYouPage, setWelcomePage } =
    useFormStore()

  const isWelcome = type === 'welcome'
  const data = isWelcome ? welcomePage : thankYouPage
  const setter = isWelcome ? setWelcomePage : setThankYouPage

  return (
    <Box className='animate-in fade-in slide-in-from-bottom-4 mx-auto max-w-[1000px] px-8 py-10 font-inter duration-500'>
      <Stack gap={32}>
        {/* Toggle Section */}
        <Group align='flex-start' gap='xl' wrap='nowrap'>
          <div className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft/30'>
            <Icon
              className='text-accent-primary'
              height={20}
              name={isWelcome ? 'lucide:megaphone' : 'lucide:party-popper'}
              width={20}
            />
          </div>
          <Box className='flex-1'>
            <Group justify='space-between'>
              <Box>
                <h2 className='text-xl font-bold text-gray-13'>
                  {isWelcome ? 'Welcome Page' : 'Thank You Page'}
                </h2>
                <p className='mt-1 text-sm text-gray-9'>
                  {isWelcome
                    ? 'Display a landing page before the first question'
                    : 'Display a custom message after the form is submitted'}
                </p>
              </Box>
              <Switch
                checked={data.enabled}
                color='accent-primary'
                size='md'
                onChange={(e) => setter({ enabled: e.currentTarget.checked })}
              />
            </Group>
          </Box>
        </Group>

        <div className='h-px bg-gray-1' />

        {/* Content Section */}
        {data.enabled ? (
          <Group align='flex-start' gap='xl' wrap='nowrap'>
            <div className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft/30'>
              <Icon
                className='text-accent-primary'
                height={20}
                name='lucide:text-cursor-input'
                width={20}
              />
            </div>
            <Box className='w-[200px] shrink-0'>
              <h3 className='text-gray-900 text-sm font-bold'>Page Content</h3>
              <p className='text-gray-500 mt-1 text-xs'>
                Configure titles and text
              </p>
            </Box>

            <Stack className='flex-1' gap='lg'>
              <TextInput
                label='Title'
                placeholder='Page Title'
                value={data.title}
                classNames={{
                  input:
                    'rounded-lg border-gray-2 bg-white transition-all focus:border-accent-primary',
                  label: 'text-gray-900 mb-2 text-xs font-bold',
                }}
                onChange={(e) => setter({ title: e.target.value })}
              />

              <Textarea
                label='Description'
                minRows={4}
                placeholder='Write a message for your respondents'
                value={data.description}
                classNames={{
                  input:
                    'rounded-lg border-gray-2 bg-white transition-all focus:border-accent-primary',
                  label: 'text-gray-900 mb-2 text-xs font-bold',
                }}
                onChange={(e) => setter({ description: e.target.value })}
              />

              {isWelcome && (
                <TextInput
                  label='Button Text'
                  placeholder="e.g., Start, Let's go!"
                  value={(data as any).buttonText}
                  classNames={{
                    input:
                      'rounded-lg border-gray-2 bg-white transition-all focus:border-accent-primary',
                    label: 'text-gray-900 mb-2 text-xs font-bold',
                  }}
                  onChange={(e) => setter({ buttonText: e.target.value })}
                />
              )}
            </Stack>
          </Group>
        ) : (
          <Box className='bg-gray-50/50 border-opacity-60 flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-3 py-24 text-center'>
            <Icon
              className='mb-2 text-gray-3'
              height={32}
              name='lucide:eye-off'
              width={32}
            />
            <Text className='text-gray-500 text-sm font-semibold'>
              Page is currently disabled
            </Text>
            <Text className='text-gray-400 mt-1 text-xs'>
              Enable it using the toggle above to customize the content.
            </Text>
          </Box>
        )}
      </Stack>
    </Box>
  )
}

WelcomeThankYouSettings.displayName = 'WelcomeThankYouSettings'
export default WelcomeThankYouSettings
