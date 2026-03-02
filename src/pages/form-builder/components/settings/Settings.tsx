import { useState } from 'react'
import GeneralSettings from './components/GeneralSettings'
import WelcomeThankYouSettings from './components/WelcomeThankYouSettings'
import HeaderFooterSettings from './components/HeaderFooterSettings'
import { Box, Group, Button } from '@mantine/core'
import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'

interface SettingsProps {
  setTab: (value: string | null) => void
}

type SubTab = 'General' | 'Rules' | 'Notifications' | 'Welcome Page' | 'Thank You Page' | 'Header & Footer'

const Settings = ({ setTab }: SettingsProps) => {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('General')

  const tabs: SubTab[] = [
    'General',
    'Rules',
    'Notifications',
    'Welcome Page',
    'Thank You Page',
    'Header & Footer'
  ]

  return (
    <div className='flex flex-col h-full bg-surface-primary animate-in fade-in duration-300'>
      {/* Settings Sub-Header */}
      <div className='flex items-center justify-between px-6 py-2 border-b border-gray-2 bg-white sticky top-0 z-20'>
        <div className='flex items-center gap-6'>
          <nav className='flex items-center gap-1'>
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveSubTab(tab)}
                className={cn(
                  'px-3 py-3 text-sm font-medium transition-all relative',
                  activeSubTab === tab
                    ? 'text-accent-primary'
                    : 'text-gray-500 hover:text-gray-900'
                )}
              >
                {tab}
                {activeSubTab === tab && (
                  <div className='absolute bottom-[-9px] left-0 right-0 h-[2px] bg-accent-primary rounded-t-full' />
                )}
              </button>
            ))}
          </nav>
        </div>

        <Group gap="sm">
          <Button
            variant="filled"
            bg="accent-primary"
            size="sm"
            leftSection={<Icon name="lucide:save" width={16} height={16} />}
            className="hover:opacity-90 transition-all font-bold px-5"
            onClick={() => setTab('Build')}
          >
            Save
          </Button>
        </Group>
      </div>

      <div className='flex-1 overflow-auto bg-gray-50/30'>
        {activeSubTab === 'General' && <GeneralSettings />}
        {activeSubTab === 'Welcome Page' && <WelcomeThankYouSettings type="welcome" />}
        {activeSubTab === 'Thank You Page' && <WelcomeThankYouSettings type="thank_you" />}
        {activeSubTab === 'Header & Footer' && <HeaderFooterSettings />}

        {['Rules', 'Notifications'].includes(activeSubTab) && (
          <Box className="max-w-[1000px] mx-auto py-24 px-6 flex flex-col items-center justify-center text-center opacity-40">
            <Icon name="lucide:construction" width={48} height={48} className="text-gray-4 mb-4" />
            <h2 className="text-xl font-bold text-gray-13">{activeSubTab} coming soon</h2>
            <p className="text-gray-9 mt-2">We are currently implementing these advanced workflow rules.</p>
          </Box>
        )}
      </div>
    </div>
  )
}

Settings.displayName = 'Settings'
export default Settings
