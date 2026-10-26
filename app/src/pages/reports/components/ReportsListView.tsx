import { useLingui } from '@lingui/react/macro'
import { useMemo, useState } from 'react'
import type { Column } from '@/components/base/data-table/types'
import type { Report, ReportStatus } from '@/pages/report-builder/types'
import IconButton from '@/components/base/button/IconButton'
import ConfirmDialog from '@/components/base/ConfirmDialog'
import useDataTable from '@/components/base/data-table/hooks/useDataTable'
import useDataTableState from '@/components/base/data-table/hooks/useDataTableState'
import Icon from '@/components/base/icon/Icon'
import showToast from '@/components/base/toast/showToast'
import CustomFilter from '@/components/common/CustomFilter'
import ReportSourceBadge from '@/components/common/ReportSourceBadge'
import ReportStatusBadge from '@/components/common/ReportStatusBadge'
import { REPORT_DOMAINS } from '@/pages/report-builder/constants'
import {
  useAiReportSourceNames,
  useDeleteReportBuilderReportMutation,
  useReportBuilderListQuery,
} from '@/pages/report-builder/hooks/useReportBuilderApi'
import cn from '@/utils/cn'
import { formatDatetime } from '@/utils/dayjs'
import AiBrandIcon from '@/components/common/AiBrandIcon'
import useUserGroupOptions from '@/pages/report-builder/hooks/useUserGroupOptions'
import ReportShareButton from './ReportShareButton'
import RowActionsMenu from './RowActionsMenu'
import Table from './Table'

type OwnershipScope = 'private' | 'shared' | ''

const matchesOwnershipScope = (
  report: Report,
  scope: OwnershipScope,
): boolean => {
  if (!scope) return true
  if (scope === 'private') return report.visibility === 'Private'
  return report.visibility !== 'Private'
}

interface ReportsListViewProps {
  showCreateButton?: boolean
  variant?: 'standalone' | 'settings'
  onCreateReport: () => void
  onEditReport: (report: Report) => void
  onOpenReport: (report: Report) => void
  onScheduleReport: (report: Report) => void
}

const ReportsListView = ({
  showCreateButton,
  variant = 'standalone',
  onCreateReport,
  onEditReport,
  onOpenReport,
  onScheduleReport,
}: ReportsListViewProps) => {
  const { t } = useLingui()

  const shouldShowCreate = showCreateButton ?? variant === 'settings'

  const {
    data: reports = [],
    error: listError,
    isFetching,
    isLoading,
    refetch,
  } = useReportBuilderListQuery()
  const deleteReportMutation = useDeleteReportBuilderReportMutation()

  const [search, setSearch] = useState('')
  const [domainFilter, setDomainFilter] = useState('')
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipScope>('')
  const [statusFilter, setStatusFilter] = useState<ReportStatus | ''>('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [deletingReport, setDeletingReport] = useState<Report | null>(null)

  const { searchState, ...restState } = useDataTableState({
    storageKey:
      variant === 'settings'
        ? 'ezofis_settings_reports_table_state'
        : 'ezofis_reports_table_state',
  })

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      // /reports only lists published reports; drafts live in the builder.
      if (variant === 'standalone' && report.status !== 'Published')
        return false
      if (statusFilter && report.status !== statusFilter) return false
      if (!matchesOwnershipScope(report, ownershipFilter)) return false
      if (domainFilter && report.domain !== domainFilter) return false
      if (search) {
        const query = search.toLowerCase()
        const matches =
          report.name.toLowerCase().includes(query) ||
          report.domain.toLowerCase().includes(query) ||
          (report.sourceType &&
            report.sourceType.toLowerCase().includes(query)) ||
          report.owner.toLowerCase().includes(query)
        if (!matches) return false
      }
      return true
    })
  }, [reports, variant, statusFilter, domainFilter, ownershipFilter, search])

  const paginatedReports = useMemo(() => {
    if (pageSize === 0) return filteredReports
    const start = (page - 1) * pageSize
    return filteredReports.slice(start, start + pageSize)
  }, [filteredReports, page, pageSize])

  // AI list rows only say "Workflow"/"Folder"; show the actual source name.
  const sourceNames = useAiReportSourceNames(paginatedReports)

  // Owner/modifier may arrive as a user id; show the user's name instead.
  const { userOptions } = useUserGroupOptions()
  const userNames = useMemo(
    () =>
      new Map(
        userOptions.map((user) => [String(user.id).toLowerCase(), user.name]),
      ),
    [userOptions],
  )

  const rows = useMemo(
    () => [
      {
        groupCount: paginatedReports.length,
        groupId: 'all',
        groupKey: '',
        groupValue: '',
        items: paginatedReports.map((report) => {
          const nameOf = (value?: string) =>
            (value && userNames.get(value.toLowerCase())) || value || ''
          return {
            ...report,
            domain: sourceNames[report.id] || report.domain,
            modifiedBy: nameOf(report.modifiedBy),
            owner: nameOf(report.owner),
          }
        }),
      },
    ],
    [paginatedReports, sourceNames, userNames],
  )

  const columns: Column[] = useMemo(() => {
    if (variant === 'standalone') {
      return [
        {
          id: 'name',
          label: t`Name`,
          size: 220,
          renderCell: (row: Report) => (
            <span
              className='cursor-pointer font-medium transition-colors hover:text-gray-13 hover:underline'
              onClick={() => onOpenReport(row)}
            >
              {row.isAiReport && (
                <AiBrandIcon
                  className='mr-1.5 inline size-3.5 align-[-2px]'
                  variant='outline-purple'
                />
              )}
              {row.name}
            </span>
          ),
        },
        {
          id: 'domain',
          label: t`Source`,
          size: 180,
          renderCell: (row: Report) => (
            <span className='text-gray-10'>{row.domain}</span>
          ),
        },
        {
          id: 'sourceType',
          label: t`Source Type`,
          size: 130,
          renderCell: (row: Report) => (
            <ReportSourceBadge sourceType={row.sourceType} />
          ),
        },
        {
          id: 'modifiedAt',
          label: t`Modified At`,
          size: 180,
          renderCell: (row: Report) => formatDatetime(row.modified, 'datetime'),
        },
        {
          id: 'modifiedBy',
          label: t`Modified By`,
          size: 160,
          renderCell: (row: Report) => row.modifiedBy || row.owner || '-',
        },
      ]
    }

    return [
      {
        id: 'name',
        label: t`Name`,
        size: 200,
        renderCell: (row: Report) => (
          <span
            className='cursor-pointer font-medium transition-colors hover:text-gray-13 hover:underline'
            onClick={() => onOpenReport(row)}
          >
            {row.isAiReport && (
              <AiBrandIcon
                className='mr-1.5 inline size-3.5 align-[-2px]'
                variant='outline-purple'
              />
            )}
            {row.name}
          </span>
        ),
      },
      {
        id: 'domain',
        label: t`Source`,
        size: 160,
        renderCell: (row: Report) => (
          <span className='text-gray-10'>{row.domain}</span>
        ),
      },
      {
        id: 'sourceType',
        label: t`Source Type`,
        size: 130,
        renderCell: (row: Report) => (
          <ReportSourceBadge sourceType={row.sourceType} />
        ),
      },
      {
        id: 'status',
        label: t`Status`,
        size: 110,
        renderCell: (row: Report) => <ReportStatusBadge status={row.status} />,
      },
      {
        id: 'scheduled',
        label: t`Scheduled`,
        size: 100,
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
        size: 140,
        renderCell: (row: Report) => row.owner || '-',
      },
      {
        id: 'modified',
        label: t`Modified`,
        size: 160,
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
          <div className='flex items-center justify-center gap-1'>
            {/* /report-ai-builder has no share endpoint yet. */}
            {!row.isAiReport && (
              <ReportShareButton reportId={row.id} iconOnly />
            )}
            <RowActionsMenu
              report={row}
              onDelete={setDeletingReport}
              onEdit={onEditReport}
              onSchedule={onScheduleReport}
            />
          </div>
        ),
      },
    ]
  }, [variant, t, onEditReport, onOpenReport, onScheduleReport])

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
  const deletingReportName = deletingReport?.name ?? ''

  const handleConfirmDelete = () => {
    if (!deletingReport) return
    deleteReportMutation.mutate(deletingReport, {
      onError: (error) => {
        showToast({
          message:
            error instanceof Error ? error.message : t`Failed to delete report`,
          variant: 'error',
        })
      },
      onSuccess: () => {
        showToast({
          message: t`Report deleted successfully`,
          variant: 'success',
        })
        setDeletingReport(null)
      },
    })
  }

  const statusFilterOptions = [
    { label: t`Draft`, value: 'Draft' },
    { label: t`Published`, value: 'Published' },
  ]
  const ownershipFilterOptions = [
    { label: t`Private to me`, value: 'private' },
    { label: t`Shared with me`, value: 'shared' },
  ]

  return (
    <div className='flex h-full min-h-0 flex-col'>
      {listError && (
        <div className='mx-4 mt-4 flex items-center gap-3 rounded-xl border border-red-3 bg-red-2 p-4 text-red-11'>
          <Icon className='size-5 shrink-0' name='lucide:triangle-alert' />
          <p className='text-13'>
            {listError instanceof Error
              ? listError.message
              : t`Failed to load reports.`}
          </p>
        </div>
      )}

      <div className='flex min-h-0 flex-1 flex-col overflow-hidden bg-surface-muted/50 p-4'>
        <div className='mb-3'>
          <CustomFilter
            searchPlaceholder={t`Search reports...`}
            searchQuery={search}
            showReset={Boolean(
              search || domainFilter || ownershipFilter || statusFilter,
            )}
            trailingActions={
              <IconButton
                ariaLabel={t`Refresh`}
                color='gray'
                disabled={isFetching}
                icon='lucide:refresh-cw'
                iconClass={cn(isFetching && 'animate-spin')}
                tooltip={t`Refresh reports`}
                variant='outline'
                onClick={() => void refetch()}
              />
            }
            activeFilters={{
              ...(domainFilter ? { domain: domainFilter } : {}),
              ...(ownershipFilter ? { ownership: ownershipFilter } : {}),
              ...(statusFilter ? { status: statusFilter } : {}),
            }}
            addButton={
              shouldShowCreate
                ? {
                    label: t`New Report`,
                    tooltip: t`New Report`,
                    onClick: onCreateReport,
                  }
                : undefined
            }
            filters={[
              ...(variant === 'settings'
                ? [
                    {
                      id: 'status',
                      label: t`Status`,
                      options: statusFilterOptions,
                    },
                  ]
                : []),
              {
                id: 'ownership',
                label: t`Sharing`,
                options: ownershipFilterOptions,
              },
              {
                id: 'domain',
                label: t`Source`,
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
              if (id === 'status') {
                setStatusFilter(value as ReportStatus | '')
                setPage(1)
              }
            }}
            onReset={() => {
              setSearch('')
              setDomainFilter('')
              setOwnershipFilter('')
              setStatusFilter('')
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
            isLoading={isLoading}
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

      <ConfirmDialog
        cancelLabel={t`Cancel`}
        confirmLabel={t`Yes, Delete`}
        description={t`Are you sure you want to delete "${deletingReportName}"? This action is permanent and cannot be undone.`}
        isConfirming={deleteReportMutation.isPending}
        opened={Boolean(deletingReport)}
        title={t`Delete Report`}
        variant='danger'
        onCancel={() => setDeletingReport(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}

ReportsListView.displayName = 'ReportsListView'
export default ReportsListView
