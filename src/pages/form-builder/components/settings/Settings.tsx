import { Box, Button, Group } from '@mantine/core'
import { useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'
import GeneralSettings from './components/GeneralSettings'
import HeaderFooterSettings from './components/HeaderFooterSettings'
import WelcomeThankYouSettings from './components/WelcomeThankYouSettings'

interface SettingsProps {
  setTab: (value: string | null) => void
}

type SubTab =
  | 'General'
  | 'Rules'
  | 'Notifications'
  | 'Welcome Page'
  | 'Thank You Page'
  | 'Header & Footer'

const Settings = ({ setTab }: SettingsProps) => {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('General')

  const tabs: SubTab[] = [
    'General',
    'Rules',
    'Notifications',
    'Welcome Page',
    'Thank You Page',
    'Header & Footer',
  ]

  return (
    <div className='animate-in fade-in flex h-full flex-col bg-surface-primary duration-300'>
      {/* Settings Sub-Header */}
      <div className='sticky top-0 z-20 flex items-center justify-between border-b border-gray-2 bg-white px-6 py-2'>
        <div className='flex items-center gap-6'>
          <nav className='flex items-center gap-1'>
            {tabs.map((tab) => (
              <button
                key={tab}
                className={cn(
                  'relative px-3 py-3 text-sm font-medium transition-all',
                  activeSubTab === tab
                    ? 'text-accent-primary'
                    : 'text-gray-500 hover:text-gray-900',
                )}
                onClick={() => setActiveSubTab(tab)}
              >
                {tab}
                {activeSubTab === tab && (
                  <div className='absolute right-0 bottom-[-9px] left-0 h-[2px] rounded-t-full bg-accent-primary' />
                )}
              </button>
            ))}
          </nav>
        </div>

        <Group gap='sm'>
          <Button
            bg='accent-primary'
            className='px-5 font-bold transition-all hover:opacity-90'
            leftSection={<Icon height={16} name='lucide:save' width={16} />}
            size='sm'
            variant='filled'
            onClick={() => setTab('Build')}
          >
            Save
          </Button>
        </Group>
      </div>

      <div className='bg-gray-50/30 flex-1 overflow-auto'>
        {activeSubTab === 'General' && <GeneralSettings />}
        {activeSubTab === 'Welcome Page' && (
          <WelcomeThankYouSettings type='welcome' />
        )}
        {activeSubTab === 'Thank You Page' && (
          <WelcomeThankYouSettings type='thank_you' />
        )}
        {activeSubTab === 'Header & Footer' && <HeaderFooterSettings />}

        {['Rules', 'Notifications'].includes(activeSubTab) && (
          <Box className='mx-auto flex max-w-[1000px] flex-col items-center justify-center px-6 py-24 text-center opacity-40'>
            <Icon
              className='mb-4 text-gray-4'
              height={48}
              name='lucide:construction'
              width={48}
            />
            <h2 className='text-xl font-bold text-gray-13'>
              {activeSubTab} coming soon
            </h2>
            <p className='mt-2 text-gray-9'>
              We are currently implementing these advanced workflow rules.
            </p>
          </Box>
        )}
      </div>
    </div>
  )
}

Settings.displayName = 'Settings'
export default Settings
