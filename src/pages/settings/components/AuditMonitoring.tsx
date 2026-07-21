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
import { useMemo, useState } from 'react'
import DataTable from '@/components/base/data-table/DataTable'
import Pagination from '@/components/base/pagination/Pagination'
import {
  settingsHeaderMeta,
  settingsTableCoreOptions,
  useSettingsTablePagination,
  useSettingsTableSearch,
} from '../helpers/settingsDataTable'
import SettingsPageHeader from './SettingsPageHeader'
import useSettingsTableToolbar from './useSettingsTableToolbar'
import CustomFilter from '@/components/common/CustomFilter'
import TableSearch from '@/components/base/data-table/actions/TableSearch'
import TableExport from '@/components/base/data-table/actions/TableExport'

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
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({})

  const todayEvents = auditEvents.filter((item) =>
    item.timestamp.startsWith('Jun 6'),
  ).length
  const securityEvents = auditEvents.filter(
    (item) => item.category === 'Security',
  ).length
  const criticalAlerts = auditEvents.filter(
    (item) => item.severity === 'critical',
  ).length

  const filteredEvents = useMemo(() => {
    return auditEvents.filter(event => {
      let matches = true
      Object.entries(activeFilters).forEach(([key, value]) => {
        if (!value) return
        if (key === 'category') {
          if (event.category !== value) matches = false
        }
        if (key === 'severity') {
          if (event.severity !== value) matches = false
        }
      })
      return matches
    })
  }, [activeFilters])

  const categoryOptions = useMemo(() => Array.from(new Set(auditEvents.map(e => e.category))).map(c => ({ label: c, value: c })), [])
  const severityOptions = useMemo(() => Array.from(new Set(auditEvents.map(e => e.severity))).map(s => ({ label: s, value: s })), [])

  const eventsTable = useAuditEventsTable(filteredEvents)

  return (
    <div className='bg-[var(--surface)] flex h-full min-h-0 flex-col'>
      <SettingsPageHeader
        description='Track user activity, configuration changes, and security events across the platform.'
        title='Audit & Monitoring'
        onBack={onBack}
      />
      <div className='flex min-h-0 flex-1 flex-col overflow-hidden p-4'>
        <CustomFilter
          filters={[
            { id: 'category', label: 'Category', options: categoryOptions },
            { id: 'severity', label: 'Severity', options: severityOptions },
          ]}
          activeFilters={activeFilters}
          onFilterChange={(id, val) => setActiveFilters(prev => ({ ...prev, [id]: val }))}
          onReset={() => {
            setActiveFilters({})
            eventsTable.tableSearchOptions.onGlobalFilterChange({ id: '', value: '' })
          }}
          showReset={Object.keys(activeFilters).some(k => activeFilters[k]) || !!eventsTable.tableSearchOptions.state.globalFilter?.value}
          customSearchComponent={<TableSearch table={eventsTable.table as any} />}
          actionButtons={[
            {
              id: 'refresh',
              icon: 'tabler:refresh',
              tooltip: 'Refresh',
              onClick: () => undefined,
              isIconButton: true,
              color: 'gray',
              variant: 'outline',
            }
          ]}
          trailingActions={<TableExport table={eventsTable.table as any} />}
        />



        <div className='mt-2 flex min-h-0 flex-1 flex-col overflow-hidden'>
            <div className='min-h-0 flex-1 overflow-hidden'>
              <DataTable
                hideActionBar
                isLoading={false}
                isReLoading={false}
                pageSize={eventsTable.pageSize}
                rowSize={eventsTable.rowSize}
                table={eventsTable.table}
                stickyHeader
                hideGrouping
                onReload={() => undefined}
                onRowSizeChange={eventsTable.onRowSizeChange}
              />
            </div>
            <Pagination
              className='mt-4 shrink-0'
              itemLabel='Events'
              page={eventsTable.page}
              pageSize={eventsTable.pageSize}
              showPageNumbers={false}
              totalItems={eventsTable.table.getFilteredRowModel().rows.length}
              onPageChange={eventsTable.onPageChange}
              onPageSizeChange={eventsTable.onPageSizeChange}
            />
          </div>
      </div>
    </div>
  )
}

function useAuditEventsTable(rows: AuditEvent[]) {
  const columnHelper = createColumnHelper<AuditEvent>()
  const tableSearchOptions = useSettingsTableSearch()
  const {
    onPageChange,
    onPageSizeChange,
    onPaginationChange,
    page,
    pageSize,
    pagination,
    paginationModel,
  } = useSettingsTablePagination()

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
    ...paginationModel,
    columns,
    data: rows,
    onPaginationChange,
    state: {
      ...tableSearchOptions.state,
      pagination,
    },
  })

  const { onRowSizeChange, rowSize, toolbar } = useSettingsTableToolbar({
    isReLoading: false,
    table,
    onReload: () => undefined,
  })

  return {
    onPageChange,
    onPageSizeChange,
    onRowSizeChange,
    page,
    pageSize,
    rowSize,
    table,
    tableSearchOptions,
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
