import { useLingui } from '@lingui/react/macro'
import { useMemo, useState } from 'react'
import type { Column } from '@/components/base/data-table/types'
import type { Report } from '@/pages/report-builder/types'
import Button from '@/components/base/button/Button'
import useDataTable from '@/components/base/data-table/hooks/useDataTable'
import useDataTableState from '@/components/base/data-table/hooks/useDataTableState'
import Icon from '@/components/base/icon/Icon'
import showToast from '@/components/base/toast/showToast'
import CustomFilter from '@/components/common/CustomFilter'
import ReportStatusBadge from '@/components/common/ReportStatusBadge'
import { REPORT_DOMAINS } from '@/pages/report-builder/constants'
import useReportsStore from '@/pages/report-builder/stores/useReportsStore'
import authUserStore from '@/stores/authUserStore'
import { formatDatetime } from '@/utils/dayjs'
import RowActionsMenu from './RowActionsMenu'
import Table from './Table'

type OwnershipScope = 'private' | 'shared' | ''

/**
 * A report is visible to the current user only if it's private (owned by
 * this session) or explicitly shared with them — reports shared with other
 * specific users (and not this one) are excluded. Group-shared reports are
 * included as a best-effort since this app has no "my group memberships"
 * API to check against.
 */
const isVisibleToUser = (report: Report, currentUserId: string): boolean => {
  if (report.visibility === 'Private') return true
  if (report.visibility === 'Selected Users')
    return report.sharedUsers.includes(currentUserId)
  if (report.visibility === 'Selected Groups')
    return report.sharedGroups.length > 0
  return false
}

const matchesOwnershipScope = (
  report: Report,
  scope: OwnershipScope,
): boolean => {
  if (!scope) return true
  if (scope === 'private') return report.visibility === 'Private'
  return report.visibility !== 'Private'
}

interface ReportsListViewProps {
  onCreateReport: () => void
  onEditReport: (report: Report) => void
  onOpenReport: (report: Report) => void
  onScheduleReport: (report: Report) => void
}

const ReportsListView = ({
  onCreateReport,
  onEditReport,
  onOpenReport,
  onScheduleReport,
}: ReportsListViewProps) => {
  const { t } = useLingui()

  const reports = useReportsStore((state) => state.reports)
  const deleteReport = useReportsStore((state) => state.deleteReport)
  const duplicateReport = useReportsStore((state) => state.duplicateReport)
  const runReportNow = useReportsStore((state) => state.runReportNow)
  const currentUserId = authUserStore((state) => state.session?.id) || ''

  const [search, setSearch] = useState('')
  const [domainFilter, setDomainFilter] = useState('')
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipScope>('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [deletingReport, setDeletingReport] = useState<Report | null>(null)

  const { searchState, ...restState } = useDataTableState({
    storageKey: 'ezofis_reports_table_state',
  })

  const myReports = useMemo(
    () => reports.filter((report) => isVisibleToUser(report, currentUserId)),
    [reports, currentUserId],
  )

  const filteredReports = useMemo(() => {
    return myReports.filter((report) => {
      if (!matchesOwnershipScope(report, ownershipFilter)) return false
      if (domainFilter && report.domain !== domainFilter) return false
      if (search) {
        const query = search.toLowerCase()
        const matches =
          report.name.toLowerCase().includes(query) ||
          report.domain.toLowerCase().includes(query) ||
          report.owner.toLowerCase().includes(query)
        if (!matches) return false
      }
      return true
    })
  }, [myReports, domainFilter, ownershipFilter, search])

  const paginatedReports = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredReports.slice(start, start + pageSize)
  }, [filteredReports, page, pageSize])

  const rows = useMemo(
    () => [
      {
        groupCount: paginatedReports.length,
        groupId: 'all',
        groupKey: '',
        groupValue: '',
        items: paginatedReports,
      },
    ],
    [paginatedReports],
  )

  const columns: Column[] = useMemo(
    () => [
      {
        id: 'name',
        label: t`Name`,
        size: 220,
        renderCell: (row: Report) => (
          <span
            className='cursor-pointer font-medium transition-colors hover:text-gray-13 hover:underline'
            onClick={() => onOpenReport(row)}
          >
            {row.name}
          </span>
        ),
      },
      {
        id: 'domain',
        label: t`Domain`,
        size: 180,
        renderCell: (row: Report) => (
          <span className='text-gray-10'>{row.domain}</span>
        ),
      },
      {
        id: 'status',
        label: t`Status`,
        size: 120,
        renderCell: (row: Report) => <ReportStatusBadge status={row.status} />,
      },
      {
        id: 'scheduled',
        label: t`Scheduled`,
        size: 110,
        renderCell: (row: Report) =>
          row.scheduled ? (
            <span className='inline-flex items-center gap-1 text-secondary-11'>
              <Icon className='size-3.5' name='lucide:calendar-clock' />
              {t`Yes`}
            </span>
          ) : (
            <span className='text-gray-9'>{t`No`}</span>
          ),
      },
      {
        id: 'owner',
        label: t`Owner`,
        size: 160,
        renderCell: (row: Report) => row.owner,
      },
      {
        id: 'visibility',
        label: t`Sharing`,
        size: 150,
        renderCell: (row: Report) => (
          <span className='inline-flex items-center gap-1.5 text-13 text-gray-11'>
            <Icon
              className='size-3.5 text-gray-9'
              name={
                row.visibility === 'Private'
                  ? 'lucide:lock'
                  : 'lucide:users-round'
              }
            />
            {row.visibility === 'Private'
              ? t`Private to me`
              : t`Shared with me`}
          </span>
        ),
      },
      {
        id: 'runs',
        label: t`Runs`,
        size: 90,
        renderCell: (row: Report) => String(row.runs),
      },
      {
        id: 'modified',
        label: t`Modified`,
        size: 170,
        renderCell: (row: Report) => formatDatetime(row.modified, 'datetime'),
      },
      {
        className: 'p-1',
        enableSorting: false,
        hideHeader: true,
        id: 'actions',
        isDisplayColumn: true,
        label: t`Actions`,
        showMenu: false,
        size: 40,
        renderCell: (row: Report) => (
          <div className='flex items-center justify-center'>
            <RowActionsMenu
              report={row}
              onDelete={setDeletingReport}
              onDuplicate={(r) => {
                duplicateReport(r.id)
                showToast({ message: t`Report duplicated`, variant: 'success' })
              }}
              onEdit={onEditReport}
              onRunNow={(r) => {
                runReportNow(r.id)
                showToast({
                  message: t`Report run started`,
                  variant: 'success',
                })
              }}
              onSchedule={onScheduleReport}
            />
          </div>
        ),
      },
    ],

    [
      t,
      duplicateReport,
      runReportNow,
      onEditReport,
      onOpenReport,
      onScheduleReport,
    ],
  )

  const { table } = useDataTable({
    columns,
    enableRowSelection: false,
    rows,
    state: { searchState, ...restState },
  })

  const domainFilterOptions = REPORT_DOMAINS.map((domain) => ({
    label: domain,
    value: domain,
  }))
  const ownershipFilterOptions = [
    { label: t`Private to me`, value: 'private' },
    { label: t`Shared with me`, value: 'shared' },
  ]

  return (
    <div className='flex h-full min-h-0 flex-col'>
      {deletingReport && (
        <div className='animate-in fade-in slide-in-from-top-4 mx-6 mt-4 flex items-center justify-between gap-4 rounded-xl border border-red-3 bg-red-2 p-4 text-red-11 shadow-sm duration-300'>
          <div className='flex items-center gap-3'>
            <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-3 text-red-11'>
              <Icon
                className='h-5 w-5 animate-pulse text-red-11'
                name='lucide:triangle-alert'
              />
            </div>
            <div>
              <h4 className='text-sm font-semibold text-red-12'>{t`Delete Report`}</h4>
              <p className='mt-0.5 text-xs text-red-11'>
                {t`Are you sure you want to delete`}{' '}
                <span className='font-bold text-red-12'>
                  "{deletingReport.name}"
                </span>
                ? {t`This action is permanent and cannot be undone.`}
              </p>
            </div>
          </div>
          <div className='flex shrink-0 items-center gap-2'>
            <Button
              color='gray'
              size='sm'
              variant='subtle'
              onClick={() => setDeletingReport(null)}
            >
              {t`Cancel`}
            </Button>
            <Button
              color='red'
              icon='lucide:trash-2'
              size='sm'
              variant='solid'
              onClick={() => {
                deleteReport(deletingReport.id)
                showToast({
                  message: t`Report deleted successfully`,
                  variant: 'success',
                })
                setDeletingReport(null)
              }}
            >
              {t`Yes, Delete`}
            </Button>
          </div>
        </div>
      )}

      <div className='bg-gray-50/50 flex min-h-0 flex-1 flex-col overflow-hidden p-4'>
        <div className='mb-3 flex flex-wrap items-center justify-between gap-3'>
          <h2 className='text-15 font-semibold text-gray-13'>{t`Reports`}</h2>

          <Button
            color='primary'
            icon='lucide:plus'
            label={t`New Report`}
            onClick={onCreateReport}
          />
        </div>

        <div className='mb-3'>
          <CustomFilter
            searchPlaceholder={t`Search reports...`}
            searchQuery={search}
            showReset={Boolean(search || domainFilter || ownershipFilter)}
            activeFilters={{
              ...(domainFilter ? { domain: domainFilter } : {}),
              ...(ownershipFilter ? { ownership: ownershipFilter } : {}),
            }}
            filters={[
              {
                id: 'ownership',
                label: t`Sharing`,
                options: ownershipFilterOptions,
              },
              {
                id: 'domain',
                label: t`Domain`,
                options: domainFilterOptions,
              },
            ]}
            onFilterChange={(id, value) => {
              if (id === 'domain') {
                setDomainFilter(value)
                setPage(1)
              }
              if (id === 'ownership') {
                setOwnershipFilter(value as OwnershipScope)
                setPage(1)
              }
            }}
            onReset={() => {
              setSearch('')
              setDomainFilter('')
              setOwnershipFilter('')
              setPage(1)
            }}
            onSearchChange={(value) => {
              setSearch(value)
              setPage(1)
            }}
          />
        </div>

        <div className='min-h-0 flex-1 overflow-hidden'>
          <Table
            isLoading={false}
            page={page}
            pageSize={pageSize}
            table={table}
            totalItems={filteredReports.length}
            onCreate={onCreateReport}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      </div>
    </div>
  )
}

ReportsListView.displayName = 'ReportsListView'
export default ReportsListView
