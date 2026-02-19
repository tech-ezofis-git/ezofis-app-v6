import { ActionIcon, ScrollArea, TextInput } from '@mantine/core'
import { createFileRoute, Link, Outlet } from '@tanstack/react-router'
import { useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import SomethingWentWrong from '@/components/common/SomethingWentWrong'
import ThemeSwitcher from '@/routes/stories/-components/ThemeSwitcher'

export const Route = createFileRoute('/stories')({
  component: RouteComponent,
  errorComponent: () => <SomethingWentWrong />,
})

const MENU_GROUPS = [
  {
    group: 'Foundations',
    items: [
      { label: 'Typography', to: '/stories/typography' },
      { label: 'Color Palette', to: '/stories/colors' },
    ],
  },
  {
    group: 'Buttons',
    items: [
      { label: 'Button', to: '/stories/button' },
      { label: 'Icon Button', to: '/stories/icon-button' },
      { label: 'AI Icon', to: '/stories/ai-icon' },
    ],
  },
  {
    group: 'Inputs',
    items: [
      { label: 'Text Input', to: '/stories/input-text' },
      { label: 'Textarea', to: '/stories/input-textarea' },
      { label: 'Number Input', to: '/stories/input-number' },
      { label: 'Password Input', to: '/stories/input-password' },
      { label: 'Pin Input', to: '/stories/input-pin' },
      { label: 'Date Input', to: '/stories/input-date' },
      { label: 'Time Input', to: '/stories/input-time' },
    ],
  },
  {
    group: 'Selection',
    items: [
      { label: 'Select', to: '/stories/input-select' },
      { label: 'Multi Select', to: '/stories/input-select-multiple' },
      { label: 'Checkbox', to: '/stories/input-checkbox' },
      { label: 'Checkbox Group', to: '/stories/input-checkbox-group' },
      { label: 'Checkbox Card', to: '/stories/input-checkbox-card' },
      { label: 'Radio', to: '/stories/input-radio' },
      { label: 'Radio Group', to: '/stories/input-radio-group' },
      { label: 'Radio Card', to: '/stories/input-radio-card' },
      { label: 'Switch', to: '/stories/input-switch' },
      { label: 'Switch Group', to: '/stories/input-switch-group' },
    ],
  },
  {
    group: 'Data Display',
    items: [
      { label: 'Alert', to: '/stories/Alert' },
      { label: 'Avatar', to: '/stories/avatar' },
      { label: 'Badge', to: '/stories/badge' },
      { label: 'Data Table', to: '/stories/data-table' },
      { label: 'Divider', to: '/stories/divider' },
      // { label: 'Card', to: '/stories/card' },
      // { label: 'Skeleton', to: '/stories/skeleton' },
      { label: 'Empty State', to: '/stories/empty-state' },
      { label: 'Highlight', to: '/stories/highlight' },
      { label: 'Indicator', to: '/stories/indicator' },
      { label: 'Table', to: '/stories/table' },
    ],
  },
  {
    group: 'Feedback',
    items: [
      { label: 'Modal', to: '/stories/modal' },
      { label: 'Drawer', to: '/stories/drawer' },
      { label: 'Pagination', to: '/stories/pagination' },
      { label: 'Popover', to: '/stories/popover' },
      { label: 'Toast', to: '/stories/toast' },
      { label: 'Tooltip', to: '/stories/tooltip' },
    ],
  },
  {
    group: 'Navigation',
    items: [
      { label: 'Menu', to: '/stories/menu' },
      { label: 'Scroll Area', to: '/stories/scroll-area' },
      { label: 'Stepper', to: '/stories/stepper' },
      { label: 'Tabs', to: '/stories/tabs' },
      { label: 'Accordion', to: '/stories/accordion' },
      { label: 'Bar Loader', to: '/stories/bar-loader' },
    ],
  },
]

function RouteComponent() {
  const [search, setSearch] = useState('')

  const filteredGroups = MENU_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) =>
      item.label.toLowerCase().includes(search.toLowerCase()),
    ),
  })).filter((group) => group.items.length > 0)

  return (
    <div className='flex h-screen overflow-hidden bg-gray-1 text-gray-12'>
      {/* Sidebar */}
      <aside className='flex w-64 flex-col border-r bg-gray-2 border-gray-3 shadow-sm'>
        <div className='border-b p-4 border-gray-3'>
          <div className='mb-4 flex items-center justify-between'>
            <span className='font-bold text-gray-12'>V6 UI Kit</span>
            <Link to='/stories'>
              <ActionIcon size='sm' variant='subtle' color='gray'>
                <Icon name='lucide:home' />
              </ActionIcon>
            </Link>
          </div>
          <TextInput
            leftSection={<Icon name='lucide:search' size={14} />}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='Search components...'
            size='xs'
            value={search}
            className='bg-gray-1'
          />
        </div>

        <ScrollArea className='flex-1 p-2'>
          <div className='space-y-6 pb-10'>
            {filteredGroups.map((group) => (
              <div key={group.group}>
                <h3 className='mb-2 px-3 text-11 font-bold uppercase tracking-wider text-gray-9'>
                  {group.group}
                </h3>
                <div className='space-y-0.5'>
                  {group.items.map((item) => (
                    <Link
                      activeProps={{
                        className: 'bg-primary-3 text-primary-11 font-medium ring-1 ring-primary-5',
                      }}
                      className='flex items-center rounded-md px-3 py-1.5 text-13 text-gray-11 transition-colors hover:bg-gray-4 hover:text-gray-12'
                      key={item.to}
                      to={item.to}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </aside>

      {/* Main Content */}
      <main className='flex-1 overflow-y-auto bg-gray-1'>
        <div className='sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-gray-1/80 px-8 backdrop-blur border-gray-3'>
          <h1 className='text-16 font-semibold text-gray-12'>Components</h1>
          <ThemeSwitcher />
        </div>
        <div className='mx-auto max-max-w-6xl p-8 pb-32'>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
