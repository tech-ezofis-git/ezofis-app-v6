import { createColumnHelper, useReactTable } from '@tanstack/react-table'
import { useLingui } from '@lingui/react/macro'
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
import { parseFilterValues } from '@/utils/filterUtils'
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
const SESSION_KEY = 'ezofis_audit_monitoring_state'

function getStoredState() {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

export default function AuditMonitoring({ onBack }: AuditUserProps) {
  const { t } = useLingui()
  const storedState = useMemo(() => getStoredState(), [])
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>(
    storedState?.activeFilters ?? {}
  )
  const [eventsData, setEventsData] = useState<EventLog[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isReLoading, setIsReLoading] = useState(false)
  const [page, setPage] = useState(storedState?.page ?? 1)
  const [pageSize, setPageSize] = useState(storedState?.pageSize ?? AUDIT_LOGS_PAGE_SIZE)

  useEffect(() => {
    try {
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ activeFilters, page, pageSize }),
      )
    } catch {
      // ignore
    }
  }, [activeFilters, page, pageSize])

  const onPageChange = useCallback((nextPage: number) => {
    setPage(nextPage)
  }, [])

  const onPageSizeChange = useCallback((nextPageSize: number) => {
    setPageSize(nextPageSize)
    setPage(1)
  }, [])

  const eventsTable = useAuditEventsTable(eventsData, SESSION_KEY)
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
        category: parseFilterValues(activeFilters.category)[0] || undefined,
        dateFrom: activeFilters.dateFrom?.startsWith('custom:')
          ? activeFilters.dateFrom.replace('custom:', '').split('_')[0]
          : activeFilters.dateFrom || undefined,
        dateTo: activeFilters.dateTo?.startsWith('custom:')
          ? activeFilters.dateTo.replace('custom:', '').split('_')[1]
          : activeFilters.dateTo || undefined,
        page,
        pageSize: pageSize === 0 ? 10000 : pageSize,
        search: searchQuery || undefined,
        severity: parseFilterValues(activeFilters.severity)[0] || undefined,
        userEmail: parseFilterValues(activeFilters.userEmail)[0] || undefined,
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
      { label: t`Authentication`, value: 'Authentication' },
      { label: t`User Management`, value: 'User Management' },
      { label: t`Security`, value: 'Security' },
      { label: t`Configuration`, value: 'Configuration' },
      { label: t`Data Access`, value: 'Data Access' },
    ],
    [t],
  )

  const severityOptions = useMemo(
    () => [
      { label: t`Info`, value: 'info' },
      { label: t`Warning`, value: 'warning' },
      { label: t`Critical`, value: 'critical' },
    ],
    [t],
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
    <main className='flex h-full min-h-0 flex-col overflow-hidden bg-[var(--surface)]'>
      <section className='flex min-h-0 flex-1 flex-col overflow-hidden'>
        <SettingsPageHeader
          description={t`Track user activity, configuration changes, and security events across the platform.`}
          title={t`Audit & Monitoring`}
          onBack={onBack}
        />
        <div className='flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-6 py-4'>
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
                tooltip: t`Refresh`,
                variant: 'outline',
                onClick: () => loadData(),
              },
            ]}
            customSearchComponent={
              <TableSearch table={eventsTable.table as any} />
            }
            filters={[
              { id: 'category', label: t`Category`, options: categoryOptions },
              { id: 'severity', label: t`Severity`, options: severityOptions },
            ]}
            moreFilters={[
              {
                id: 'userEmail',
                label: t`User Email`,
                options: userEmailOptions,
              },
              { dataType: 'date', id: 'dateFrom', label: t`Date From` },
              { dataType: 'date', id: 'dateTo', label: t`Date To` },
            ]}
            showReset={
              Object.keys(activeFilters).some((k) => activeFilters[k]) ||
              !!searchQuery
            }
            onFilterChange={handleFilterChange}
            onReset={handleResetFilters}
          />

          <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
            <div className='min-h-0 flex-1 overflow-hidden'>
              <DataTable
                emptyDescription={t`No audit events or monitoring logs available.`}
                emptyIcon='lucide:shield'
                emptyTitle={t`No logs found`}
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
              itemLabel={t`Logs`}
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
  const { t } = useLingui()
  const normalizedSeverity = (severity || 'info').toLowerCase()
  const label =
    normalizedSeverity === 'warning'
      ? t`Warning`
      : normalizedSeverity === 'critical'
        ? t`Critical`
        : t`Info`

  return (
    <span
      className={cn(
        'inline-flex rounded-[8px] border px-3 py-1 text-xs font-medium shadow-sm',
        normalizedSeverity === 'info' && 'border-blue-5 bg-blue-2 text-blue-11',
        normalizedSeverity === 'warning' &&
          'border-orange-5 bg-orange-2 text-orange-11',
        normalizedSeverity === 'critical' &&
          'border-red-5 bg-red-2 text-red-11',
      )}
    >
      {label}
    </span>
  )
}

function useAuditEventsTable(rows: EventLog[], storageKey?: string) {
  const { t } = useLingui()
  const columnHelper = createColumnHelper<EventLog>()
  const tableSearchOptions = useSettingsTableSearch(storageKey)

  const columns = useMemo(
    () => [
      columnHelper.accessor('eventTitle', {
        enableSorting: false,
        header: t`Event Title`,
        meta: { ...settingsHeaderMeta.start, label: t`Event Title` },
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
        header: t`User`,
        meta: { ...settingsHeaderMeta.start, label: t`User` },
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
        header: t`Category`,
        meta: { ...settingsHeaderMeta.start, label: t`Category` },
        minSize: 140,
        size: 160,
        cell: (info) => <CategoryCell category={info.getValue()} />,
      }),
      columnHelper.accessor('severity', {
        enableSorting: false,
        header: t`Severity`,
        meta: { ...settingsHeaderMeta.start, label: t`Severity` },
        minSize: 110,
        size: 120,
        cell: (info) => (
          <SeverityBadge severity={info.getValue() as Severity} />
        ),
      }),
      columnHelper.accessor('createdAtUtc', {
        enableSorting: false,
        header: t`Created Date`,
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
    [columnHelper, t],
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
