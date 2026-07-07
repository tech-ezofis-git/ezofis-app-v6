import {
  BadgeDollarSign,
  ChevronRight,
  ClipboardList,
  Code2,
  FolderOpen,
  PanelsTopLeft,
  Shield,
  UserRoundCheck,
  Users,
} from 'lucide-react'
import React, { useState } from 'react'
import AuditMonitoring from './components/AuditMonitoring'
import Credits from './components/credits/Credits'
import DmsSettings from './components/Folders/DmsSettings'
import GroupManagement from './components/GroupManagement'
import ManageUser from './components/ManageUser'
import Menu from './components/Menus'
import RolesPermissions from './components/RolesPermissions'
type SettingsItem = {
  description: string
  icon: React.ElementType
  key: string
  title: string
}

const settingsItems: SettingsItem[] = [
  {
    description:
      'Add, edit, and manage platform users. Configure authentication and assign roles.',
    icon: Users,
    key: 'user-management',
    title: 'User Management',
  },
  {
    description:
      'Define roles and configure granular permissions across all modules.',
    icon: Shield,
    key: 'roles-permissions',
    title: 'Roles & Permissions',
  },
  {
    description:
      'Create logical groups to organize users by team, department, or function.',
    icon: UserRoundCheck,
    key: 'group-management',
    title: 'Group Management',
  },
  {
    description:
      'Control navigation visibility, ordering, and default landing pages per role.',
    icon: PanelsTopLeft,
    key: 'menu-profiles',
    title: 'Menu & Profiles',
  },
  {
    description:
      'Create document repositories with custom fields, security, and versioning.',
    icon: FolderOpen,
    key: 'dms-folders',
    title: 'DMS & Folders',
  },
  // {
  //   key: 'ai-agent-config',
  //   title: 'AI Agent Config',
  //   description:
  //     'Configure OCR engine, approval thresholds, matching rules, and more.',
  //   icon: Bot,
  // },
  {
    description:
      'View activity logs, security events, and configuration change history.',
    icon: ClipboardList,
    key: 'audit-monitoring',
    title: 'Audit & Monitoring',
  },
  {
    description:
      'Explore, test, and debug API endpoints with live requests and sample responses.',
    icon: Code2,
    key: 'playground',
    title: 'Playground API',
  },
  {
    description:
      'Monitor credit consumption, usage trends, and module-wise activity across the platform.',
    icon: BadgeDollarSign,
    key: 'credit',
    title: 'Credit Usage',
  },
]

export default function SettingsMain() {
  const [activePage, setActivePage] = useState<string>('settings')

  if (activePage === 'user-management') {
    return <ManageUser onBack={() => setActivePage('settings')} />
  }
  if (activePage === 'roles-permissions') {
    return <RolesPermissions onBack={() => setActivePage('settings')} />
  }
  if (activePage === 'group-management') {
    return <GroupManagement onBack={() => setActivePage('settings')} />
  }

  if (activePage === 'menu-profiles') {
    return <Menu onBack={() => setActivePage('settings')} />
  }
  if (activePage === 'dms-folders') {
    return <DmsSettings onBack={() => setActivePage('settings')} />
  }

  if (activePage === 'audit-monitoring') {
    return <AuditMonitoring onBack={() => setActivePage('settings')} />
  }
  if (activePage === 'playground') {
    window.open(
      'https://ezagentplayground.onrender.com/apikey.html?id=2',
      '_blank',
    )
    setActivePage('settings')
  }
  if (activePage === 'credit') {
    return <Credits onBack={() => setActivePage('settings')} />
  }

  return (
    <main className='overflow-y-auto bg-[var(--surface)]'>
      <section className='mb-4 flex items-center justify-between border-b border-gray-3 bg-surface px-6 py-4 md:px-8'>
        <div className='flex flex-col gap-1'>
          <h1 className='text-18/6 font-semibold tracking-tight text-gray-13'>
            Settings &amp; Administration
          </h1>
          <p className='text-13/5 text-gray-11'>
            Configure your AP Agent and DMS platform
          </p>
        </div>
      </section>

      <section
        aria-label='Settings administration modules'
        className='mt-8 grid max-h-[calc(100vh-150px)] max-w-[93vw] grid-cols-1 gap-4 px-6 py-4 md:px-8 lg:grid-cols-2'
      >
        {settingsItems.map((item) => {
          const Icon = item.icon

          return (
            <button
              className='group grid min-h-[88px] w-full grid-cols-[40px_1fr_24px] items-start rounded-[12px] border border-[var(--border-default)] bg-[var(--surface-primary)] px-6 py-5 text-left shadow-[var(--shadow-sm)] transition hover:border-[var(--primary-7)] hover:shadow-[var(--shadow-md)]'
              key={item.key}
              type='button'
              onClick={() => setActivePage(item.key)}
            >
              <span className='flex h-8 w-8 items-center justify-center pt-1 text-[var(--primary-10)]'>
                <Icon size={20} strokeWidth={1.9} />
              </span>

              <span className='min-w-0'>
                <span className='block text-sm leading-5 font-semibold text-[var(--text-primary)]'>
                  {item.title}
                </span>

                <span className='mt-1 block text-xs leading-5 text-[var(--text-secondary)]'>
                  {item.description}
                </span>
              </span>

              <ChevronRight
                className='mt-1 text-[var(--gray-8)] transition group-hover:translate-x-1 group-hover:text-[var(--primary-10)]'
                size={20}
                strokeWidth={1.8}
              />
            </button>
          )
        })}
      </section>
    </main>
  )
}
