import { useMemo, useState } from 'react'
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
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import DataTable from '@/components/base/data-table/DataTable'
import InputSelect from '@/components/base/inputs/InputSelect'
import IconButton from "@/components/base/button/IconButton";
type AuditUserProps = {
  onBack?: () => void;
};
type Severity = 'info' | 'warning' | 'critical'

type AuditEvent = {
  id: number
  event: string
  eventType: string
  user: string
  email: string
  category: 'Authentication' | 'User Management' | 'Security' | 'Configuration' | 'Data Access'
  severity: Severity
  ipAddress: string
  timestamp: string
}

type SelectOption = {
  id: string | number
  name: string
  description?: string
  disabled?: boolean
  value?: string
}

type StatCardProps = {
  icon: typeof ClipboardList
  value: string | number
  label: string
  meta?: string
}

const auditEvents: AuditEvent[] = [
  {
    id: 1,
    event: 'User logged in successfully',
    eventType: 'Login',
    user: 'John Smith',
    email: 'john@company.com',
    category: 'Authentication',
    severity: 'info',
    ipAddress: '192.168.1.100',
    timestamp: 'Jun 6, 07:24',
  },
  {
    id: 2,
    event: 'New user account created: David Hughes',
    eventType: 'User Created',
    user: 'Sarah Miller',
    email: 'sarah@company.com',
    category: 'User Management',
    severity: 'info',
    ipAddress: '192.168.1.101',
    timestamp: 'Jun 6, 07:24',
  },
  {
    id: 3,
    event: 'Role permissions updated for AP Officer',
    eventType: 'Permission Changed',
    user: 'Admin',
    email: 'admin@company.com',
    category: 'Security',
    severity: 'warning',
    ipAddress: '192.168.1.1',
    timestamp: 'Jun 6, 07:24',
  },
  {
    id: 4,
    event: 'New folder created: Q2 Invoices',
    eventType: 'Folder Created',
    user: 'Mike Johnson',
    email: 'mike@company.com',
    category: 'Configuration',
    severity: 'info',
    ipAddress: '192.168.1.102',
    timestamp: 'Jun 6, 07:24',
  },
  {
    id: 5,
    event: 'Failed login attempt (3rd attempt) - account locked',
    eventType: 'Security Event',
    user: 'Unknown',
    email: 'unknown@external.com',
    category: 'Security',
    severity: 'critical',
    ipAddress: '10.0.0.55',
    timestamp: 'Jun 6, 07:24',
  },
  {
    id: 6,
    event: 'AI confidence threshold updated from 85% to 90%',
    eventType: 'Config Changed',
    user: 'Admin',
    email: 'admin@company.com',
    category: 'Configuration',
    severity: 'info',
    ipAddress: '192.168.1.1',
    timestamp: 'Jun 6, 07:24',
  },
  {
    id: 7,
    event: 'User list exported to CSV',
    eventType: 'Export',
    user: 'Tom Wilson',
    email: 'tom@company.com',
    category: 'Data Access',
    severity: 'info',
    ipAddress: '192.168.1.103',
    timestamp: 'Jun 6, 07:24',
  },
  {
    id: 8,
    event: 'User role changed: David Hughes from Business User to AP Officer',
    eventType: 'Role Changed',
    user: 'Sarah Miller',
    email: 'sarah@company.com',
    category: 'User Management',
    severity: 'warning',
    ipAddress: '192.168.1.101',
    timestamp: 'Jun 6, 07:24',
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

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ')
}

function StatCard({ icon: Icon, value, label, meta }: StatCardProps) {
  return (
    <div className="relative rounded-[12px] border border-[#DEE5EE] bg-white p-6 shadow-sm">
      {meta && <div className="absolute right-6 top-7 text-xs font-medium text-[#8A98AA]">{meta}</div>}
      <Icon size={18} className="mb-7 text-[#7C5CFF]" />
      <div className="text-[28px] font-bold leading-none text-[#07142B]">{value}</div>
      <div className="mt-2 text-sm text-[#526987]">{label}</div>
    </div>
  )
}

function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-[8px] border px-3 py-1 text-xs font-medium capitalize shadow-sm',
        severity === 'info' && 'border-[#B8D7FF] bg-[#EFF6FF] text-[#1D5FD1]',
        severity === 'warning' && 'border-[#FFD77A] bg-[#FFF8E6] text-[#A75A00]',
        severity === 'critical' && 'border-[#FFB7B7] bg-[#FFF1F1] text-[#C51F1F]'
      )}
    >
      {severity}
    </span>
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
    <div className="flex items-center gap-2 text-[#07142B]">
      <Icon size={15} className="shrink-0 text-[#526987]" />
      <span className="leading-tight">{category}</span>
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
            <div className="font-semibold text-[#07142B]">{row.original.event}</div>
            <div className="mt-1 text-xs text-[#526987]">{row.original.eventType}</div>
          </div>
        ),
      }),
      columnHelper.accessor('user', {
        header: 'User',
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-[#07142B]">{row.original.user}</div>
            <div className="mt-1 text-xs text-[#526987]">{row.original.email}</div>
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
        cell: (info) => <span className="font-mono text-xs text-[#526987]">{info.getValue()}</span>,
      }),
      columnHelper.accessor('timestamp', {
        header: 'Timestamp',
        cell: (info) => <span className="text-sm text-[#526987]">{info.getValue()}</span>,
      }),
    ],
    [columnHelper]
  )

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <DataTable
      table={table}
      pageSize={rows.length || 8}
      stickyHeader
      component={<div />}
      isReLoading={false}
      onReload={() => undefined}
    />
  )
}

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

      const matchesCategory = categoryValue === 'all' || item.category === categoryValue
      const matchesSeverity = severityValue === 'all' || item.severity === severityValue

      return matchesSearch && matchesCategory && matchesSeverity
    })
  }, [search, category, severity])

  const todayEvents = auditEvents.filter((item) => item.timestamp.startsWith('Jun 6')).length
  const securityEvents = auditEvents.filter((item) => item.category === 'Security').length
  const criticalAlerts = auditEvents.filter((item) => item.severity === 'critical').length

  return (
    <div className="">
      <div className="mb-4 flex items-center justify-between border-b border-gray-3 bg-surface px-6 py-4 md:px-8">
  <div className="flex items-start gap-3">
    <IconButton
      ariaLabel="Back"
      color="gray"
      icon="lucide:arrow-left"
      size="sm"
      variant="ghost"
      onClick={onBack}
    />

    <div>
      <h1 className="text-18/6 font-semibold tracking-tight text-gray-13">
        Audit & Monitoring
      </h1>

      <p className="text-13/5 text-gray-11">
        Track user activity, configuration changes, and security events across the platform.
      </p>
    </div>
  </div>

  <button
    type="button"
    className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#DEE5EE] bg-white px-4 text-sm font-semibold text-[#07142B] shadow-sm transition hover:bg-[#F8FAFC]"
  >
    <Download size={16} />
    Export Logs
  </button>
</div>
<div className='px-6 py-4 max-h-[calc(100vh-150px)] overflow-y-auto '>
      <div className="grid grid-cols-4 gap-5">
        <StatCard icon={ClipboardList} value={auditEvents.length} label="Total Events" />
        <StatCard icon={LogIn} value={todayEvents} label="Today's Events" />
        <StatCard icon={Shield} value={securityEvents} label="Security Events" />
        <StatCard icon={Shield} value={criticalAlerts} label="Critical Alerts" meta="1 active" />
      </div>

      <div className="mt-6 grid grid-cols-[1fr_176px_144px] gap-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#526987]" size={18} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search events..."
            className="h-10 w-full rounded-[10px] border border-[#DEE5EE] bg-white pl-11 pr-4 text-sm shadow-sm outline-none transition focus:border-[#7C5CFF]"
          />
        </div>

        <InputSelect
          value={category}
          options={categoryOptions}
          onChange={(item) => {
            if (!item) return
            setCategory(item)
          }}
        />

        <InputSelect
          value={severity}
          options={severityOptions}
          onChange={(item) => {
            if (!item) return
            setSeverity(item)
          }}
        />
      </div>

      <div className="">
        <AuditEventsTable rows={filteredEvents} />
      </div>
      </div>
    </div>
  )
}
