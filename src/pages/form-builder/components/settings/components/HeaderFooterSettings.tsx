import { Box, Group, Stack, Switch, TextInput } from '@mantine/core'
import Icon from '@/components/base/icon/Icon'
import { useFormStore } from '@/pages/form-builder/store/formStore'

const HeaderFooterSettings = () => {
  const { footerText, headerText, showHeaderFooter, setHeaderFooter } =
    useFormStore()

  return (
    <Box className='animate-in fade-in slide-in-from-bottom-4 mx-auto max-w-[1000px] px-8 py-10 font-inter duration-500'>
      <Stack gap={32}>
        {/* Toggle Section */}
        <Group align='flex-start' gap='xl' wrap='nowrap'>
          <div className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft/30'>
            <Icon
              className='text-accent-primary'
              height={20}
              name='lucide:layout-template'
              width={20}
            />
          </div>
          <Box className='flex-1'>
            <Group justify='space-between'>
              <Box>
                <h2 className='text-xl font-bold text-gray-13'>
                  Header & Footer
                </h2>
                <p className='mt-1 text-sm text-gray-9'>
                  Add persistent branding or navigation elements to every page
                  of your form
                </p>
              </Box>
              <Switch
                checked={showHeaderFooter}
                color='accent-primary'
                size='md'
                onChange={(e) =>
                  setHeaderFooter({ show: e.currentTarget.checked })
                }
              />
            </Group>
          </Box>
        </Group>

        <div className='h-px bg-gray-1' />

        {/* Content Section */}
        {showHeaderFooter ? (
          <Group align='flex-start' gap='xl' wrap='nowrap'>
            <div className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft/30'>
              <Icon
                className='text-accent-primary'
                height={20}
                name='lucide:copyright'
                width={20}
              />
            </div>
            <Box className='w-[200px] shrink-0'>
              <h3 className='text-gray-900 text-sm font-bold'>
                Branding Content
              </h3>
              <p className='text-gray-500 mt-1 text-xs'>
                Global header and footer text
              </p>
            </Box>

            <Stack className='flex-1' gap='lg'>
              <TextInput
                label='Header Text'
                placeholder='e.g., Ezofis Survey 2024'
                value={headerText}
                classNames={{
                  input:
                    'rounded-lg border-gray-2 bg-white transition-all focus:border-accent-primary',
                  label: 'text-gray-900 mb-2 text-xs font-bold',
                }}
                onChange={(e) => setHeaderFooter({ header: e.target.value })}
              />

              <TextInput
                label='Footer Text'
                placeholder='e.g., © 2024 Ezofis. All rights reserved.'
                value={footerText}
                classNames={{
                  input:
                    'rounded-lg border-gray-2 bg-white transition-all focus:border-accent-primary',
                  label: 'text-gray-900 mb-2 text-xs font-bold',
                }}
                onChange={(e) => setHeaderFooter({ footer: e.target.value })}
              />
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
            <div className='text-gray-500 text-sm font-semibold'>
              Header & Footer are currently disabled
            </div>
            <div className='text-gray-400 mt-1 text-xs'>
              Enable them using the toggle above to customize the content.
            </div>
          </Box>
        )}
      </Stack>
    </Box>
  )
}

HeaderFooterSettings.displayName = 'HeaderFooterSettings'
export default HeaderFooterSettings
