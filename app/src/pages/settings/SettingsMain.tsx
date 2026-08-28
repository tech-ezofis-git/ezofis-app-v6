import { useLingui } from '@lingui/react/macro'
import { useNavigate } from '@tanstack/react-router'
import {
  BadgeDollarSign,
  ChevronRight,
  ClipboardList,
  Code2,
  FileText,
  FolderOpen,
  GitFork,
  Globe,
  Palette,
  Shield,
  UserRoundCheck,
  Users,
} from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'
import Divider from '@/components/base/Divider'
import ColorPreference from '@/pages/my-account/components/color-preference/ColorPreference'
import authUserStore from '@/stores/authUserStore'
import AuditMonitoring from './components/AuditMonitoring'
import Credits from './components/credits/Credits'
import DmsSettings from './components/Folders/DmsSettings'
import GroupManagement from './components/GroupManagement'
import ManageUser from './components/ManageUser'
import PortalConfiguration from './components/PortalConfiguration'
import RolesPermissions from './components/RolesPermissions'
import { createSettingsRootBreadcrumbs } from './helpers/settingsBreadcrumbs'
import useSettingsTopbar from './hooks/useSettingsTopbar'

type SettingsItem = {
  description: string
  href?: string
  icon: React.ElementType
  key: string
  title: string
}

const SETTINGS_PAGES = new Set([
  'audit-monitoring',
  'branding',
  'credit',
  'folder-configuration',
  'group-management',
  'playground',
  'portal-configuration',
  'roles-permissions',
  'settings',
  'user-management',
])

const CONFIGURATION_SETTINGS_KEYS = [
  'folder-configuration',
  'form-configuration',
  'workflow-configuration',
  'portal-configuration',
]

const ACCESS_SETTINGS_KEYS = [
  'user-management',
  'group-management',
  'roles-permissions',
]

const PLATFORM_SETTINGS_KEYS = [
  'branding',
  'credit',
  'playground',
  'audit-monitoring',
]

const pickSettingsItems = (items: SettingsItem[], keys: string[]) =>
  keys
    .map((key) => items.find((item) => item.key === key))
    .filter((item): item is SettingsItem => Boolean(item))

export default function SettingsMain() {
  const session = authUserStore((state) => state.session)
  const isAdmin = session?.role?.toLowerCase() === 'admin'
  const [activePage, setActivePage] = useState<string>(() => {
    try {
      const stored = sessionStorage.getItem('ezofis_settings_state')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (
          typeof parsed.activePage === 'string' &&
          SETTINGS_PAGES.has(parsed.activePage)
        ) {
          return parsed.activePage
        }
      }
    } catch {
      // ignore
    }
    return 'settings'
  })

  useEffect(() => {
    try {
      sessionStorage.setItem(
        'ezofis_settings_state',
        JSON.stringify({ activePage }),
      )
    } catch {
      // ignore
    }
  }, [activePage])

  useEffect(() => {
    if (activePage !== 'playground') return
    window.open('https://demo.ezofis.com/V6Playground/apikey.html', '_blank')
    setActivePage('settings')
  }, [activePage])

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

  if (activePage === 'portal-configuration') {
    return (
      <SettingsDetailShell>
        <PortalConfiguration onBack={() => setActivePage('settings')} />
      </SettingsDetailShell>
    )
  }

  if (activePage === 'branding') {
    if (!isAdmin) {
      return <SettingsLanding onOpenPage={setActivePage} />
    }
    return (
      <SettingsDetailShell>
        <ColorPreference onBack={() => setActivePage('settings')} />
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
    <div className='flex h-full min-h-0 flex-col overflow-hidden'>
      {children}
    </div>
  )
}

function SettingsLanding({
  onOpenPage,
}: {
  onOpenPage: (page: string) => void
}) {
  const { i18n, t } = useLingui()
  const navigate = useNavigate()
  const isAdmin = authUserStore(
    (state) => state.session?.role?.toLowerCase() === 'admin',
  )

  const settingsItems: SettingsItem[] = useMemo(() => {
    const items: SettingsItem[] = [
      {
        description: t`Set up folders with custom fields, storage, security, and versioning.`,
        icon: FolderOpen,
        key: 'folder-configuration',
        title: t`Folder Configuration`,
      },
      {
        description: t`Create and manage forms with fields, validation, and data collection.`,
        href: '/forms',
        icon: FileText,
        key: 'form-configuration',
        title: t`Form Configuration`,
      },
      {
        description: t`Design and configure automated workflows and process routing.`,
        href: '/workflows',
        icon: GitFork,
        key: 'workflow-configuration',
        title: t`Workflow Configuration`,
      },
      {
        description: t`Create branded portals, configure login methods, and connect workflows.`,
        icon: Globe,
        key: 'portal-configuration',
        title: t`Portal Configuration`,
      },
      {
        description: t`Add, edit, and manage platform users. Configure authentication and assign roles.`,
        icon: Users,
        key: 'user-management',
        title: t`User Management`,
      },
      {
        description: t`Create logical groups to organize users by team, department, or function.`,
        icon: UserRoundCheck,
        key: 'group-management',
        title: t`Group Management`,
      },
      {
        description: t`Define roles and configure granular permissions across all modules.`,
        icon: Shield,
        key: 'roles-permissions',
        title: t`Roles & Permissions`,
      },
      {
        description: t`Customize logos, brand colors, and visual identity across the platform.`,
        icon: Palette,
        key: 'branding',
        title: t`Branding`,
      },
      {
        description: t`Monitor credit consumption, usage trends, and module-wise activity across the platform.`,
        icon: BadgeDollarSign,
        key: 'credit',
        title: t`Credit Usage`,
      },
      {
        description: t`Explore, test, and debug API endpoints with live requests and sample responses.`,
        icon: Code2,
        key: 'playground',
        title: t`Playground API`,
      },
      {
        description: t`View activity logs, security events, and configuration change history.`,
        icon: ClipboardList,
        key: 'audit-monitoring',
        title: t`Audit & Monitoring`,
      },
    ]
    return isAdmin ? items : items.filter((item) => item.key !== 'branding')
  }, [i18n.locale, isAdmin, t])

  const configurationItems = useMemo(
    () => pickSettingsItems(settingsItems, CONFIGURATION_SETTINGS_KEYS),
    [settingsItems],
  )
  const accessItems = useMemo(
    () => pickSettingsItems(settingsItems, ACCESS_SETTINGS_KEYS),
    [settingsItems],
  )
  const platformItems = useMemo(
    () => pickSettingsItems(settingsItems, PLATFORM_SETTINGS_KEYS),
    [settingsItems],
  )

  const rootBreadcrumbs = useMemo(
    () => createSettingsRootBreadcrumbs(t`Settings`),
    [i18n.locale, t],
  )
  useSettingsTopbar(rootBreadcrumbs)

  const openItem = (item: SettingsItem) => {
    if (item.href) {
      void navigate({ to: item.href })
      return
    }
    onOpenPage(item.key)
  }

  return (
    <div className='flex h-full min-h-0 flex-col overflow-hidden'>
      <main className='ez-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[var(--surface)]'>
        <div className='flex flex-col gap-6 p-4'>
          <section
            aria-label={t`Configuration modules`}
            className='grid grid-cols-1 gap-4 lg:grid-cols-2'
          >
            {configurationItems.map((item) => (
              <SettingsModuleCard
                item={item}
                key={item.key}
                onOpen={openItem}
              />
            ))}
          </section>

          <Divider />

          <section
            aria-label={t`User access modules`}
            className='grid grid-cols-1 gap-4 lg:grid-cols-2'
          >
            {accessItems.map((item) => (
              <SettingsModuleCard
                item={item}
                key={item.key}
                onOpen={openItem}
              />
            ))}
          </section>

          <Divider />

          <section
            aria-label={t`Platform and monitoring`}
            className='grid grid-cols-1 gap-4 lg:grid-cols-2'
          >
            {platformItems.map((item) => (
              <SettingsModuleCard
                item={item}
                key={item.key}
                onOpen={openItem}
              />
            ))}
          </section>
        </div>
      </main>
    </div>
  )
}

function SettingsModuleCard({
  item,
  onOpen,
}: {
  item: SettingsItem
  onOpen: (item: SettingsItem) => void
}) {
  const Icon = item.icon

  return (
    <button
      className='group flex min-h-[88px] w-full items-start gap-4 rounded-[12px] border border-[var(--border-default)] bg-[var(--surface-primary)] px-6 py-5 text-left shadow-[var(--shadow-sm)] transition hover:border-[var(--primary-7)] hover:shadow-[var(--shadow-md)] active:scale-[0.99]'
      type='button'
      onClick={() => onOpen(item)}
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
}
