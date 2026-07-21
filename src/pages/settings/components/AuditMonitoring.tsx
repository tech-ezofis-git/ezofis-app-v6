import { createColumnHelper, useReactTable } from '@tanstack/react-table'
import { Database, LogIn, Settings, Shield, UserCog } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  type EventLog,
  getEventLogs,
  type GetEventLogsParams,
} from '@/api/eventLogs'
import TableExport from '@/components/base/data-table/actions/TableExport'
import TableSearch from '@/components/base/data-table/actions/TableSearch'
import DataTable from '@/components/base/data-table/DataTable'
import Pagination from '@/components/base/pagination/Pagination'
import showToast from '@/components/base/toast/showToast'
import CustomFilter from '@/components/common/CustomFilter'
import { formatDatetime } from '@/utils/dayjs'
import {
  settingsHeaderMeta,
  settingsTableCoreOptions,
  useSettingsTableSearch,
} from '../helpers/settingsDataTable'
import SettingsPageHeader from './SettingsPageHeader'
import useSettingsTableToolbar from './useSettingsTableToolbar'

type AuditUserProps = {
  onBack?: () => void
}

type Severity = 'info' | 'warning' | 'critical' | string

const AUDIT_LOGS_PAGE_SIZE = 100

export default function AuditMonitoring({ onBack }: AuditUserProps) {
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({})
  const [eventsData, setEventsData] = useState<EventLog[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isReLoading, setIsReLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(AUDIT_LOGS_PAGE_SIZE)

  const onPageChange = useCallback((nextPage: number) => {
    setPage(nextPage)
  }, [])

  const onPageSizeChange = useCallback((nextPageSize: number) => {
    setPageSize(nextPageSize)
    setPage(1)
  }, [])

  const eventsTable = useAuditEventsTable(eventsData)
  const searchQuery =
    eventsTable.tableSearchOptions.state.globalFilter?.value || ''

  // Track initial load vs subsequent loads
  const isInitialLoadRef = useRef(true)

  const loadData = useCallback(
    async (signal?: AbortSignal) => {
      if (isInitialLoadRef.current) {
        setIsLoading(true)
      } else {
        setIsReLoading(true)
      }

      const params: GetEventLogsParams = {
        category: activeFilters.category || undefined,
        dateFrom: activeFilters.dateFrom || undefined,
        dateTo: activeFilters.dateTo || undefined,
        page,
        pageSize,
        search: searchQuery || undefined,
        severity: activeFilters.severity || undefined,
        userEmail: activeFilters.userEmail || undefined,
      }

      const response = await getEventLogs(params, { signal })

      if (signal?.aborted) return

      setIsLoading(false)
      setIsReLoading(false)

      if (response.error) {
        showToast({ message: response.error, variant: 'error' })
        return
      }

      if (response.data) {
        setEventsData(response.data.data)
        setTotalCount(response.data.totalCount)
        isInitialLoadRef.current = false
      }
    },
    [page, pageSize, activeFilters, searchQuery],
  )

  useEffect(() => {
    const controller = new AbortController()
    loadData(controller.signal)
    return () => {
      controller.abort()
    }
  }, [loadData])

  const categoryOptions = useMemo(
    () => [
      { label: 'Authentication', value: 'Authentication' },
      { label: 'User Management', value: 'User Management' },
      { label: 'Security', value: 'Security' },
      { label: 'Configuration', value: 'Configuration' },
      { label: 'Data Access', value: 'Data Access' },
    ],
    [],
  )

  const severityOptions = useMemo(
    () => [
      { label: 'Info', value: 'info' },
      { label: 'Warning', value: 'warning' },
      { label: 'Critical', value: 'critical' },
    ],
    [],
  )

  const userEmailOptions = useMemo(() => {
    const emails = Array.from(
      new Set(eventsData.map((e) => e.userEmail).filter(Boolean)),
    )
    return emails.map((email) => ({ label: email, value: email }))
  }, [eventsData])

  const handleFilterChange = (id: string, val: string) => {
    setActiveFilters((prev) => ({ ...prev, [id]: val }))
    onPageChange(1)
  }

  const handleResetFilters = () => {
    setActiveFilters({})
    eventsTable.tableSearchOptions.onGlobalFilterChange({ id: '', value: '' })
    onPageChange(1)
  }

  return (
    <main className='flex h-full min-h-0 flex-col bg-[var(--surface)]'>
      <section className='flex min-h-0 flex-1 flex-col'>
        <SettingsPageHeader
          description='Track user activity, configuration changes, and security events across the platform.'
          title='Audit & Monitoring'
          onBack={onBack}
        />
        <div className='flex flex-1 flex-col overflow-hidden p-4'>
          <CustomFilter
            activeFilters={activeFilters}
            trailingActions={<TableExport table={eventsTable.table as any} />}
            actionButtons={[
              {
                color: 'gray',
                disabled: isLoading || isReLoading,
                icon: 'tabler:refresh',
                id: 'refresh',
                isIconButton: true,
                tooltip: 'Refresh',
                variant: 'outline',
                onClick: () => loadData(),
              },
            ]}
            customSearchComponent={
              <TableSearch table={eventsTable.table as any} />
            }
            filters={[
              { id: 'category', label: 'Category', options: categoryOptions },
              { id: 'severity', label: 'Severity', options: severityOptions },
              {
                id: 'userEmail',
                label: 'User Email',
                options: userEmailOptions,
                searchable: true,
              },
            ]}
            moreFilters={[
              { dataType: 'date', id: 'dateFrom', label: 'Date From' },
              { dataType: 'date', id: 'dateTo', label: 'Date To' },
            ]}
            showReset={
              Object.keys(activeFilters).some((k) => activeFilters[k]) ||
              !!searchQuery
            }
            onFilterChange={handleFilterChange}
            onReset={handleResetFilters}
          />

          <div className='mt-2 flex min-h-0 flex-1 flex-col overflow-hidden'>
            <div className='min-h-0 flex-1 overflow-hidden'>
              <DataTable
                emptyDescription='No audit events or monitoring logs available.'
                emptyIcon='lucide:shield'
                emptyTitle='No logs found'
                isLoading={isLoading}
                isReLoading={isReLoading}
                pageSize={pageSize}
                rowSize={eventsTable.rowSize}
                table={eventsTable.table}
                hideActionBar
                hideGrouping
                stickyHeader
                onReload={() => loadData()}
                onRowSizeChange={eventsTable.onRowSizeChange}
              />
            </div>

            <Pagination
              className='mt-4 shrink-0'
              itemLabel='Logs'
              page={page}
              pageSize={pageSize}
              showPageNumbers={false}
              totalItems={totalCount}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
            />
          </div>
        </div>
      </section>
    </main>
  )
}

function CategoryCell({ category }: { category: EventLog['category'] }) {
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
      <span className='leading-tight'>{category || '-'}</span>
    </div>
  )
}

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ')
}

function SeverityBadge({ severity }: { severity: Severity }) {
  const normalizedSeverity = (severity || 'info').toLowerCase()

  return (
    <span
      className={cn(
        'inline-flex rounded-[8px] border px-3 py-1 text-xs font-medium capitalize shadow-sm',
        normalizedSeverity === 'info' && 'border-blue-5 bg-blue-2 text-blue-11',
        normalizedSeverity === 'warning' &&
          'border-orange-5 bg-orange-2 text-orange-11',
        normalizedSeverity === 'critical' &&
          'border-red-5 bg-red-2 text-red-11',
      )}
    >
      {normalizedSeverity}
    </span>
  )
}

function useAuditEventsTable(rows: EventLog[]) {
  const columnHelper = createColumnHelper<EventLog>()
  const tableSearchOptions = useSettingsTableSearch()

  const columns = useMemo(
    () => [
      columnHelper.accessor('eventTitle', {
        enableSorting: false,
        header: 'Event Title',
        meta: { ...settingsHeaderMeta.start, label: 'Event Title' },
        minSize: 200,
        size: 240,
        cell: ({ row }) => (
          <div className='min-w-0 truncate font-semibold text-gray-13'>
            {row.original.eventTitle}
          </div>
        ),
      }),
      columnHelper.accessor('userEmail', {
        enableSorting: false,
        header: 'User',
        meta: { ...settingsHeaderMeta.start, label: 'User' },
        minSize: 200,
        size: 240,
        cell: ({ row }) => (
          <span className='block truncate font-medium text-gray-13'>
            {row.original.userEmail || '-'}
          </span>
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
        cell: (info) => (
          <SeverityBadge severity={info.getValue() as Severity} />
        ),
      }),
      columnHelper.accessor('createdAtUtc', {
        enableSorting: false,
        header: 'Created Date',
        meta: settingsHeaderMeta.start,
        minSize: 150,
        size: 170,
        cell: (info) => (
          <span className='text-sm text-gray-11'>
            {info.getValue()
              ? formatDatetime(info.getValue(), 'datetime')
              : '-'}
          </span>
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

  const { rowSize, toolbar, onRowSizeChange } = useSettingsTableToolbar({
    isReLoading: false,
    table,
    onReload: () => undefined,
  })

  return {
    rowSize,
    table,
    tableSearchOptions,
    toolbar,
    onRowSizeChange,
  }
}
