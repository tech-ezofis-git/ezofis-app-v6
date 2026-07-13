import {
  createColumnHelper,
  useReactTable,
} from '@tanstack/react-table'
import {
  ClipboardList,
  Database,
  LogIn,
  Settings,
  Shield,
  UserCog,
} from 'lucide-react'
import { useMemo } from 'react'
import DataTable from '@/components/base/data-table/DataTable'
import {
  settingsHeaderMeta,
  settingsTableCoreOptions,
  useSettingsTableSearch,
} from '../helpers/settingsDataTable'
import SettingsPageHeader from './SettingsPageHeader'
import useSettingsTableToolbar from './useSettingsTableToolbar'
type AuditEvent = {
  category:
    | 'Authentication'
    | 'User Management'
    | 'Security'
    | 'Configuration'
    | 'Data Access'
  email: string
  event: string
  eventType: string
  id: number
  ipAddress: string
  severity: Severity
  timestamp: string
  user: string
}
type AuditUserProps = {
  onBack?: () => void
}

type Severity = 'info' | 'warning' | 'critical'

type StatCardProps = {
  icon: typeof ClipboardList
  label: string
  meta?: string
  value: string | number
}

const auditEvents: AuditEvent[] = [
  {
    category: 'Authentication',
    email: 'john@company.com',
    event: 'User logged in successfully',
    eventType: 'Login',
    id: 1,
    ipAddress: '192.168.1.100',
    severity: 'info',
    timestamp: 'Jun 6, 07:24',
    user: 'John Smith',
  },
  {
    category: 'User Management',
    email: 'sarah@company.com',
    event: 'New user account created: David Hughes',
    eventType: 'User Created',
    id: 2,
    ipAddress: '192.168.1.101',
    severity: 'info',
    timestamp: 'Jun 6, 07:24',
    user: 'Sarah Miller',
  },
  {
    category: 'Security',
    email: 'admin@company.com',
    event: 'Role permissions updated for AP Officer',
    eventType: 'Permission Changed',
    id: 3,
    ipAddress: '192.168.1.1',
    severity: 'warning',
    timestamp: 'Jun 6, 07:24',
    user: 'Admin',
  },
  {
    category: 'Configuration',
    email: 'mike@company.com',
    event: 'New folder created: Q2 Invoices',
    eventType: 'Folder Created',
    id: 4,
    ipAddress: '192.168.1.102',
    severity: 'info',
    timestamp: 'Jun 6, 07:24',
    user: 'Mike Johnson',
  },
  {
    category: 'Security',
    email: 'unknown@external.com',
    event: 'Failed login attempt (3rd attempt) - account locked',
    eventType: 'Security Event',
    id: 5,
    ipAddress: '10.0.0.55',
    severity: 'critical',
    timestamp: 'Jun 6, 07:24',
    user: 'Unknown',
  },
  {
    category: 'Configuration',
    email: 'admin@company.com',
    event: 'AI confidence threshold updated from 85% to 90%',
    eventType: 'Config Changed',
    id: 6,
    ipAddress: '192.168.1.1',
    severity: 'info',
    timestamp: 'Jun 6, 07:24',
    user: 'Admin',
  },
  {
    category: 'Data Access',
    email: 'tom@company.com',
    event: 'User list exported to CSV',
    eventType: 'Export',
    id: 7,
    ipAddress: '192.168.1.103',
    severity: 'info',
    timestamp: 'Jun 6, 07:24',
    user: 'Tom Wilson',
  },
  {
    category: 'User Management',
    email: 'sarah@company.com',
    event: 'User role changed: David Hughes from Business User to AP Officer',
    eventType: 'Role Changed',
    id: 8,
    ipAddress: '192.168.1.101',
    severity: 'warning',
    timestamp: 'Jun 6, 07:24',
    user: 'Sarah Miller',
  },
]

export default function AuditMonitoring({ onBack }: AuditUserProps) {
  const todayEvents = auditEvents.filter((item) =>
    item.timestamp.startsWith('Jun 6'),
  ).length
  const securityEvents = auditEvents.filter(
    (item) => item.category === 'Security',
  ).length
  const criticalAlerts = auditEvents.filter(
    (item) => item.severity === 'critical',
  ).length

  const eventsTable = useAuditEventsTable(auditEvents)

  return (
    <div className='bg-[var(--surface)]'>
      <SettingsPageHeader
        description='Track user activity, configuration changes, and security events across the platform.'
        title='Audit & Monitoring'
        toolbar={eventsTable.toolbar}
        onBack={onBack}
      />
      <div className='max-h-[calc(100vh-150px)] overflow-y-auto px-6 py-4 md:px-8'>
        <div className='grid grid-cols-4 gap-5'>
          <StatCard
            icon={ClipboardList}
            label='Total Events'
            value={auditEvents.length}
          />
          <StatCard icon={LogIn} label="Today's Events" value={todayEvents} />
          <StatCard
            icon={Shield}
            label='Security Events'
            value={securityEvents}
          />
          <StatCard
            icon={Shield}
            label='Critical Alerts'
            meta='1 active'
            value={criticalAlerts}
          />
        </div>

        <div className='py-4'>
          <DataTable
            hideActionBar
            isLoading={false}
            isReLoading={false}
            pageSize={auditEvents.length || 8}
            rowSize={eventsTable.rowSize}
            table={eventsTable.table}
            stickyHeader
            hideGrouping
            onReload={() => undefined}
            onRowSizeChange={eventsTable.onRowSizeChange}
          />
        </div>
      </div>
    </div>
  )
}

function useAuditEventsTable(rows: AuditEvent[]) {
  const columnHelper = createColumnHelper<AuditEvent>()
  const tableSearchOptions = useSettingsTableSearch()

  const columns = useMemo(
    () => [
      columnHelper.accessor('event', {
        enableSorting: false,
        header: 'Event',
        meta: { ...settingsHeaderMeta.start, label: 'Event' },
        minSize: 200,
        size: 240,
        cell: ({ row }) => (
          <div className='min-w-0'>
            <div className='truncate font-semibold text-gray-13'>
              {row.original.event}
            </div>
            <div className='truncate text-xs text-gray-11'>
              {row.original.eventType}
            </div>
          </div>
        ),
      }),
      columnHelper.accessor('user', {
        enableSorting: false,
        header: 'User',
        meta: { ...settingsHeaderMeta.start, label: 'User' },
        minSize: 200,
        size: 240,
        cell: ({ row }) => (
          <div className='min-w-0'>
            <div className='truncate font-medium text-gray-13'>
              {row.original.user}
            </div>
            <div className='truncate text-xs text-gray-11'>
              {row.original.email}
            </div>
          </div>
        ),
      }),
      columnHelper.accessor('category', {
        enableSorting: false,
        header: 'Category',
        meta: { ...settingsHeaderMeta.start, label: 'Category' },
        minSize: 140,
        size: 160,
        cell: (info) => <CategoryCell category={info.getValue()} />,
      }),
      columnHelper.accessor('severity', {
        enableSorting: false,
        header: 'Severity',
        meta: { ...settingsHeaderMeta.start, label: 'Severity' },
        minSize: 110,
        size: 120,
        cell: (info) => <SeverityBadge severity={info.getValue()} />,
      }),
      columnHelper.accessor('ipAddress', {
        enableSorting: false,
        header: 'IP Address',
        meta: settingsHeaderMeta.start,
        minSize: 130,
        size: 150,
        cell: (info) => (
          <span className='font-mono text-xs text-gray-11'>
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor('timestamp', {
        enableSorting: false,
        header: 'Timestamp',
        meta: settingsHeaderMeta.start,
        minSize: 150,
        size: 170,
        cell: (info) => (
          <span className='text-sm text-gray-11'>{info.getValue()}</span>
        ),
      }),
    ],
    [columnHelper],
  )

  const table = useReactTable({
    ...settingsTableCoreOptions,
    ...tableSearchOptions,
    columns,
    data: rows,
  })

  const { onRowSizeChange, rowSize, toolbar } = useSettingsTableToolbar({
    isReLoading: false,
    table,
    onReload: () => undefined,
  })

  return {
    onRowSizeChange,
    rowSize,
    table,
    toolbar,
  }
}

function CategoryCell({ category }: { category: AuditEvent['category'] }) {
  const Icon =
    category === 'Authentication'
      ? LogIn
      : category === 'User Management'
        ? UserCog
        : category === 'Security'
          ? Shield
          : category === 'Configuration'
            ? Settings
            : Database

  return (
    <div className='flex items-center gap-2 text-gray-13'>
      <Icon className='shrink-0 text-gray-11' size={15} />
      <span className='leading-tight'>{category}</span>
    </div>
  )
}

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ')
}

function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-[8px] border px-3 py-1 text-xs font-medium capitalize shadow-sm',
        severity === 'info' && 'border-blue-5 bg-blue-2 text-blue-11',
        severity === 'warning' && 'border-orange-5 bg-orange-2 text-orange-11',
        severity === 'critical' && 'border-red-5 bg-red-2 text-red-11',
      )}
    >
      {severity}
    </span>
  )
}

function StatCard({ icon: Icon, label, meta, value }: StatCardProps) {
  return (
    <div className='relative rounded-[12px] border border-[var(--border-default)] bg-surface p-6 shadow-[var(--shadow-sm)]'>
      {meta && (
        <div className='absolute top-7 right-6 text-xs font-medium text-gray-10'>
          {meta}
        </div>
      )}
      <Icon className='mb-7 text-primary-9' size={18} />
      <div className='text-[28px] leading-none font-bold text-gray-13'>
        {value}
      </div>
      <div className='mt-2 text-sm text-gray-11'>{label}</div>
    </div>
  )
}
