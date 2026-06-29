import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  ClipboardList,
  Database,
  Download,
  LogIn,
  Search,
  Settings,
  Shield,
  UserCog,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import IconButton from '@/components/base/button/IconButton'
import DataTable from '@/components/base/data-table/DataTable'
import InputSelect from '@/components/base/inputs/InputSelect'
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

type SelectOption = {
  description?: string
  disabled?: boolean
  id: string | number
  name: string
  value?: string
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

const categoryOptions: SelectOption[] = [
  { id: 'all', name: 'All Categories' },
  { id: 'Authentication', name: 'Authentication' },
  { id: 'User Management', name: 'User Management' },
  { id: 'Security', name: 'Security' },
  { id: 'Configuration', name: 'Configuration' },
  { id: 'Data Access', name: 'Data Access' },
]

const severityOptions: SelectOption[] = [
  { id: 'all', name: 'All Severity' },
  { id: 'info', name: 'Info' },
  { id: 'warning', name: 'Warning' },
  { id: 'critical', name: 'Critical' },
]

export default function AuditMonitoring({ onBack }: AuditUserProps) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<SelectOption>(categoryOptions[0])
  const [severity, setSeverity] = useState<SelectOption>(severityOptions[0])

  const filteredEvents = useMemo(() => {
    const searchValue = search.trim().toLowerCase()
    const categoryValue = String(category.id)
    const severityValue = String(severity.id)

    return auditEvents.filter((item) => {
      const matchesSearch =
        !searchValue ||
        `${item.event} ${item.eventType} ${item.user} ${item.email} ${item.category} ${item.ipAddress}`
          .toLowerCase()
          .includes(searchValue)

      const matchesCategory =
        categoryValue === 'all' || item.category === categoryValue
      const matchesSeverity =
        severityValue === 'all' || item.severity === severityValue

      return matchesSearch && matchesCategory && matchesSeverity
    })
  }, [search, category, severity])

  const todayEvents = auditEvents.filter((item) =>
    item.timestamp.startsWith('Jun 6'),
  ).length
  const securityEvents = auditEvents.filter(
    (item) => item.category === 'Security',
  ).length
  const criticalAlerts = auditEvents.filter(
    (item) => item.severity === 'critical',
  ).length

  return (
    <div className=''>
      <div className='mb-4 flex items-center justify-between border-b border-gray-3 bg-surface px-6 py-4 md:px-8'>
        <div className='flex items-start gap-3'>
          <IconButton
            ariaLabel='Back'
            color='gray'
            icon='lucide:arrow-left'
            size='sm'
            variant='ghost'
            onClick={onBack}
          />

          <div>
            <h1 className='text-18/6 font-semibold tracking-tight text-gray-13'>
              Audit & Monitoring
            </h1>

            <p className='text-13/5 text-gray-11'>
              Track user activity, configuration changes, and security events
              across the platform.
            </p>
          </div>
        </div>

        <button
          className='inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#DEE5EE] bg-white px-4 text-sm font-semibold text-[#07142B] shadow-sm transition hover:bg-[#F8FAFC]'
          type='button'
        >
          <Download size={16} />
          Export Logs
        </button>
      </div>
      <div className='max-h-[calc(100vh-150px)] overflow-y-auto px-6 py-4'>
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

        <div className='mt-6 grid grid-cols-[1fr_176px_144px] gap-3'>
          <div className='relative'>
            <Search
              className='absolute top-1/2 left-4 -translate-y-1/2 text-[#526987]'
              size={18}
            />
            <input
              className='h-10 w-full rounded-[10px] border border-[#DEE5EE] bg-white pr-4 pl-11 text-sm shadow-sm transition outline-none focus:border-[#7C5CFF]'
              placeholder='Search events...'
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <InputSelect
            options={categoryOptions}
            value={category}
            onChange={(item) => {
              if (!item) return
              setCategory(item)
            }}
          />

          <InputSelect
            options={severityOptions}
            value={severity}
            onChange={(item) => {
              if (!item) return
              setSeverity(item)
            }}
          />
        </div>

        <div className=''>
          <AuditEventsTable rows={filteredEvents} />
        </div>
      </div>
    </div>
  )
}

function AuditEventsTable({ rows }: { rows: AuditEvent[] }) {
  const columnHelper = createColumnHelper<AuditEvent>()

  const columns = useMemo(
    () => [
      columnHelper.accessor('event', {
        header: 'Event',
        cell: ({ row }) => (
          <div>
            <div className='font-semibold text-[#07142B]'>
              {row.original.event}
            </div>
            <div className='mt-1 text-xs text-[#526987]'>
              {row.original.eventType}
            </div>
          </div>
        ),
      }),
      columnHelper.accessor('user', {
        header: 'User',
        cell: ({ row }) => (
          <div>
            <div className='font-medium text-[#07142B]'>
              {row.original.user}
            </div>
            <div className='mt-1 text-xs text-[#526987]'>
              {row.original.email}
            </div>
          </div>
        ),
      }),
      columnHelper.accessor('category', {
        header: 'Category',
        cell: (info) => <CategoryCell category={info.getValue()} />,
      }),
      columnHelper.accessor('severity', {
        header: 'Severity',
        cell: (info) => <SeverityBadge severity={info.getValue()} />,
      }),
      columnHelper.accessor('ipAddress', {
        header: 'IP Address',
        cell: (info) => (
          <span className='font-mono text-xs text-[#526987]'>
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor('timestamp', {
        header: 'Timestamp',
        cell: (info) => (
          <span className='text-sm text-[#526987]'>{info.getValue()}</span>
        ),
      }),
    ],
    [columnHelper],
  )

  const table = useReactTable({
    columns,
    data: rows,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <DataTable
      component={<div />}
      isReLoading={false}
      pageSize={rows.length || 8}
      table={table}
      stickyHeader
      onReload={() => undefined}
    />
  )
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
    <div className='flex items-center gap-2 text-[#07142B]'>
      <Icon className='shrink-0 text-[#526987]' size={15} />
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
        severity === 'info' && 'border-[#B8D7FF] bg-[#EFF6FF] text-[#1D5FD1]',
        severity === 'warning' &&
          'border-[#FFD77A] bg-[#FFF8E6] text-[#A75A00]',
        severity === 'critical' &&
          'border-[#FFB7B7] bg-[#FFF1F1] text-[#C51F1F]',
      )}
    >
      {severity}
    </span>
  )
}

function StatCard({ icon: Icon, label, meta, value }: StatCardProps) {
  return (
    <div className='relative rounded-[12px] border border-[#DEE5EE] bg-white p-6 shadow-sm'>
      {meta && (
        <div className='absolute top-7 right-6 text-xs font-medium text-[#8A98AA]'>
          {meta}
        </div>
      )}
      <Icon className='mb-7 text-[#7C5CFF]' size={18} />
      <div className='text-[28px] leading-none font-bold text-[#07142B]'>
        {value}
      </div>
      <div className='mt-2 text-sm text-[#526987]'>{label}</div>
    </div>
  )
}
