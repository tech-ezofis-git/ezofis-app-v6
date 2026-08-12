import {
  BadgeDollarSign,
  ChevronRight,
  ClipboardList,
  Code2,
  FolderOpen,
  Shield,
  UserRoundCheck,
  Users,
} from 'lucide-react'
import { useLingui } from '@lingui/react/macro'
import React, { useMemo, useState } from 'react'
import AuditMonitoring from './components/AuditMonitoring'
import Credits from './components/credits/Credits'
import DmsSettings from './components/Folders/DmsSettings'
import GroupManagement from './components/GroupManagement'
import ManageUser from './components/ManageUser'
import RolesPermissions from './components/RolesPermissions'
import { createSettingsRootBreadcrumbs } from './helpers/settingsBreadcrumbs'
import useSettingsTopbar from './hooks/useSettingsTopbar'

type SettingsItem = {
  description: string
  icon: React.ElementType
  key: string
  title: string
}

export default function SettingsMain() {
  const [activePage, setActivePage] = useState<string>('settings')

  if (activePage === 'user-management') {
    return (
      <SettingsDetailShell>
        <ManageUser onBack={() => setActivePage('settings')} />
      </SettingsDetailShell>
    )
  }
  if (activePage === 'roles-permissions') {
    return (
      <SettingsDetailShell>
        <RolesPermissions onBack={() => setActivePage('settings')} />
      </SettingsDetailShell>
    )
  }
  if (activePage === 'group-management') {
    return (
      <SettingsDetailShell>
        <GroupManagement onBack={() => setActivePage('settings')} />
      </SettingsDetailShell>
    )
  }

  if (activePage === 'folder-configuration') {
    return (
      <SettingsDetailShell>
        <DmsSettings onBack={() => setActivePage('settings')} />
      </SettingsDetailShell>
    )
  }

  if (activePage === 'audit-monitoring') {
    return (
      <SettingsDetailShell>
        <AuditMonitoring onBack={() => setActivePage('settings')} />
      </SettingsDetailShell>
    )
  }
  if (activePage === 'playground') {
    window.open('https://demo.ezofis.com/V6Playground/apikey.html', '_blank')
    setActivePage('settings')
  }
  if (activePage === 'credit') {
    return (
      <SettingsDetailShell>
        <Credits onBack={() => setActivePage('settings')} />
      </SettingsDetailShell>
    )
  }

  return <SettingsLanding onOpenPage={setActivePage} />
}

function SettingsDetailShell({ children }: { children: React.ReactNode }) {
  return (
    <div className='flex h-full min-h-0 flex-col overflow-hidden'>{children}</div>
  )
}

function SettingsLanding({
  onOpenPage,
}: {
  onOpenPage: (page: string) => void
}) {
  const { i18n, t } = useLingui()

  const settingsItems: SettingsItem[] = useMemo(
    () => [
      {
        description: t`Add, edit, and manage platform users. Configure authentication and assign roles.`,
        icon: Users,
        key: 'user-management',
        title: t`User Management`,
      },
      {
        description: t`Define roles and configure granular permissions across all modules.`,
        icon: Shield,
        key: 'roles-permissions',
        title: t`Roles & Permissions`,
      },
      {
        description: t`Create logical groups to organize users by team, department, or function.`,
        icon: UserRoundCheck,
        key: 'group-management',
        title: t`Group Management`,
      },
      {
        description: t`Set up folders with custom fields, storage, security, and versioning.`,
        icon: FolderOpen,
        key: 'folder-configuration',
        title: t`Folder Configuration`,
      },
      {
        description: t`View activity logs, security events, and configuration change history.`,
        icon: ClipboardList,
        key: 'audit-monitoring',
        title: t`Audit & Monitoring`,
      },
      {
        description: t`Explore, test, and debug API endpoints with live requests and sample responses.`,
        icon: Code2,
        key: 'playground',
        title: t`Playground API`,
      },
      {
        description: t`Monitor credit consumption, usage trends, and module-wise activity across the platform.`,
        icon: BadgeDollarSign,
        key: 'credit',
        title: t`Credit Usage`,
      },
    ],
    [i18n.locale, t],
  )

  const rootBreadcrumbs = useMemo(
    () => createSettingsRootBreadcrumbs(t`Settings`),
    [i18n.locale, t],
  )
  useSettingsTopbar(rootBreadcrumbs)

  return (
    <div className='flex h-full min-h-0 flex-col overflow-hidden'>
      <main className='ez-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[var(--surface)]'>
      <section
        aria-label={t`Settings administration modules`}
        className='grid grid-cols-1 gap-4 p-4 lg:grid-cols-2'
      >
        {settingsItems.map((item) => {
          const Icon = item.icon

          return (
            <button
              className='group flex min-h-[88px] w-full items-start gap-4 rounded-[12px] border border-[var(--border-default)] bg-[var(--surface-primary)] px-6 py-5 text-left shadow-[var(--shadow-sm)] transition hover:border-[var(--primary-7)] hover:shadow-[var(--shadow-md)]'
              key={item.key}
              type='button'
              onClick={() => onOpenPage(item.key)}
            >
              <span className='flex h-5 w-5 shrink-0 items-center justify-center text-[var(--primary-10)]'>
                <Icon size={20} strokeWidth={1.9} />
              </span>

              <span className='min-w-0 flex-1'>
                <span className='block text-sm leading-5 font-semibold text-[var(--text-primary)]'>
                  {item.title}
                </span>

                <span className='mt-1 block text-xs leading-5 text-[var(--text-secondary)]'>
                  {item.description}
                </span>
              </span>

              <ChevronRight
                className='mt-0.5 shrink-0 text-[var(--gray-8)] transition group-hover:translate-x-1 group-hover:text-[var(--primary-10)]'
                size={20}
                strokeWidth={1.8}
              />
            </button>
          )
        })}
      </section>
    </main>
    </div>
  )
}
