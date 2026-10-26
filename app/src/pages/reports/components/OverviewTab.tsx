import { useLingui } from '@lingui/react/macro'
import { useNavigate } from '@tanstack/react-router'
import dayjs from 'dayjs'
import { useCallback, useMemo, useState } from 'react'
import type { ReportSpec } from '@/api/v6/reportAgent'
import type { Row } from '@/components/base/data-table/types'
import type {
  FilterDefinition,
  FilterGroup,
} from '@/components/common/CustomFilter'
import type { Report } from '@/pages/report-builder/types'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import TableExport from '@/components/base/data-table/actions/TableExport'
import TableSearch from '@/components/base/data-table/actions/TableSearch'
import DataTable from '@/components/base/data-table/DataTable'
import useDataTable from '@/components/base/data-table/hooks/useDataTable'
import useDataTableState from '@/components/base/data-table/hooks/useDataTableState'
import Icon from '@/components/base/icon/Icon'
import Pagination from '@/components/base/pagination/Pagination'
import showToast from '@/components/base/toast/showToast'
import { AnimateFadeIn } from '@/components/common/animations'
import CustomFilter from '@/components/common/CustomFilter'
import {
  useReportAgentDataQuery,
  useReportBuilderDataQuery,
} from '@/pages/report-builder/hooks/useReportBuilderApi'
import { isIdColumn } from '@/pages/report-builder/utils/hiddenColumns'
import { resolveFieldStatus } from '@/pages/report-builder/utils/resolveFieldStatus'
import Request from '@/pages/requests/components/request/Request'
import useInlineRequestOverview from '@/pages/requests/hooks/useInlineRequestOverview'
import cn from '@/utils/cn'
import {
  detectFieldType,
  generateCategoryOptions,
  generateDateRanges,
  generateNumericBuckets,
  isDateColumnType,
  isNumberColumnType,
  matchesCategoryFilterValue,
  matchesDateRangeValue,
  parseFilterValues,
} from '@/utils/filterUtils'
import { formatReportDate, parseUtcDate } from '@/utils/utcDate'
import StatusPill from './StatusPill'

interface OverviewColumn {
  id: string
  label: string
}

interface Props {
  report: Report
}

const PAGE_SIZE = 200

// Row fields (not table columns) carrying the ids a Req No link opens.
const WORKFLOW_ID_KEY = '__workflowId'
const INSTANCE_ID_KEY = '__instanceId'

// Normalized names the run may use for those ids.
const WORKFLOW_ID_NAMES = ['workflowid', 'wfid']
const INSTANCE_ID_NAMES = ['instanceid', 'workflowinstanceid', 'processid']

const normalizeName = (value: string | undefined) =>
  (value ?? '').toLowerCase().replace(/[\s_\-.#]/g, '')

/** The request-number column: key `id` (labelled "Req No") or a Req/Request No label. */
const isRequestNumberColumn = (col: OverviewColumn) =>
  normalizeName(col.id) === 'id' ||
  /^(req|request)(no|num|number)$/.test(normalizeName(col.label))

// DataTable rows need their own `id`/`name`, which would overwrite report
// columns keyed `id` (Req No) or `name`; those cells read an alias instead.
const RESERVED_ROW_KEYS = new Set(['id', 'name'])
const cellKey = (columnId: string) =>
  RESERVED_ROW_KEYS.has(columnId) ? `__cell_${columnId}` : columnId

const toTableRow = (row: Record<string, string>, index: number) => ({
  ...row,
  [cellKey('id')]: row.id ?? '',
  [cellKey('name')]: row.name ?? '',
  id: String(index),
  name: '',
})

/** The local calendar day of a UTC timestamp, so date filters match what is shown. */
const toLocalDay = (value: string) => {
  const date = parseUtcDate(value)
  return date ? dayjs(date).format('YYYY-MM-DD') : value
}

const OverviewTab = ({ report }: Props) => {
  const { t } = useLingui()
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({})
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)

  const isAgentReport = Boolean(report.agentConfig)
  const legacyQuery = useReportBuilderDataQuery(
    isAgentReport ? null : report.id,
  )
  const agentQuery = useReportAgentDataQuery(report)
  const runResult = isAgentReport ? agentQuery.data?.result : legacyQuery.data
  const isLoading = isAgentReport ? agentQuery.isLoading : legacyQuery.isLoading
  const isFetching = isAgentReport
    ? agentQuery.isFetching
    : legacyQuery.isFetching
  const agentError = isAgentReport ? agentQuery.error?.message : undefined

  const refresh = () =>
    void (isAgentReport ? agentQuery.refetch() : legacyQuery.refetch())

  // Highlights sent on the run response win over the ones saved with the report.
  const fieldSettings = useMemo(
    () => ({ ...report.fieldSettings, ...agentQuery.data?.fieldSettings }),
    [report.fieldSettings, agentQuery.data?.fieldSettings],
  )

  const previewColumns: OverviewColumn[] = useMemo(() => {
    const columns = runResult?.columns ?? []
    return (
      columns
        // Internal identifier columns are fetched but never displayed.
        .filter((col) => !isIdColumn(col.key, col.label))
        .map((col) => {
          const fieldId = isAgentReport
            ? col.key
            : report.fields.find(
                (id) => fieldSettings[id]?.label === col.label,
              ) || col.key
          return { id: fieldId, label: col.label }
        })
    )
  }, [runResult, isAgentReport, report.fields, fieldSettings])

  // Hidden workflow/instance id columns of the run, used to open a row's
  // request from its Req No cell.
  const linkColumns = useMemo(() => {
    const columns = runResult?.columns ?? []
    const find = (names: string[]) =>
      columns.find(
        (col) =>
          names.includes(normalizeName(col.key)) ||
          names.includes(normalizeName(col.label)),
      )
    return {
      instance: find(INSTANCE_ID_NAMES),
      workflow: find(WORKFLOW_ID_NAMES),
    }
  }, [runResult])

  const sourceRows: Record<string, string>[] = useMemo(() => {
    const rows = runResult?.rows ?? []
    // From the run's column when there is one, else from a matching
    // row-level field the run returned without a column.
    const read = (
      row: Record<string, string>,
      names: string[],
      col?: { key: string; label: string },
    ) => {
      const fromColumn = col ? row[col.key] || row[col.label] : ''
      if (fromColumn) return fromColumn
      const key = Object.keys(row).find(
        (k) => names.includes(normalizeName(k)) && row[k],
      )
      return key ? row[key] : ''
    }
    return rows.map((row) => {
      const mapped: Record<string, string> = {}
      previewColumns.forEach((col) => {
        mapped[col.id] = row[col.label] ?? ''
      })
      mapped[INSTANCE_ID_KEY] = read(
        row,
        INSTANCE_ID_NAMES,
        linkColumns.instance,
      )
      mapped[WORKFLOW_ID_KEY] = read(
        row,
        WORKFLOW_ID_NAMES,
        linkColumns.workflow,
      )
      return mapped
    })
  }, [runResult, previewColumns, linkColumns])

  // A row's request opens in place of the table; the table stays mounted
  // (hidden) so its filters, page and scroll survive the round trip.
  const requestOverview = useInlineRequestOverview({
    onClosedByAction: () => {
      // An approve/reject may have changed the row's stage/status.
      void (isAgentReport ? agentQuery.refetch() : legacyQuery.refetch())
    },
    onError: () =>
      showToast({
        message: t`Couldn't open this request. Try again.`,
        variant: 'error',
      }),
  })
  const { open: openRequestOverview } = requestOverview

  const openRequest = useCallback(
    (row: Row) => {
      const workflowId = String(row[WORKFLOW_ID_KEY] ?? '')
      const instanceId = String(row[INSTANCE_ID_KEY] ?? '')
      if (!workflowId || !instanceId) return
      void openRequestOverview({ instanceId, workflowId })
    },
    [openRequestOverview],
  )

  const valueForColumn = useCallback(
    (col: OverviewColumn, row: Record<string, string>) => {
      const setting = fieldSettings[col.id]
      if (setting?.colType === 'status') {
        return resolveFieldStatus(setting, row)?.label ?? row[col.id] ?? ''
      }
      return row[col.id] ?? ''
    },
    [fieldSettings],
  )

  // Detected once per column; drives date formatting and filtering.
  const columnTypes = useMemo(() => {
    const types: Record<string, string> = {}
    previewColumns.forEach((col) => {
      types[col.id] =
        fieldSettings[col.id]?.colType === 'status'
          ? 'category'
          : detectFieldType(sourceRows, col.id, (r) => valueForColumn(col, r))
    })
    return types
  }, [previewColumns, fieldSettings, sourceRows, valueForColumn])

  const displayValueForColumn = useCallback(
    (col: OverviewColumn, row: Record<string, string>) => {
      const value = valueForColumn(col, row)
      return value && isDateColumnType(columnTypes[col.id])
        ? formatReportDate(value)
        : value
    },
    [valueForColumn, columnTypes],
  )

  // Columns formatted for TanStack Table and TableSearch
  const columns = useMemo(
    () =>
      previewColumns.map((col) => {
        const setting = fieldSettings[col.id]
        const key = cellKey(col.id)
        const isDate = isDateColumnType(columnTypes[col.id])
        return {
          id: col.id,
          label: col.label,
          meta: { label: col.label },
          size: 180,
          accessorFn: (row: Row) => row[key],
          renderCell: (row: Row) => {
            if (
              isRequestNumberColumn(col) &&
              row[WORKFLOW_ID_KEY] &&
              row[INSTANCE_ID_KEY]
            ) {
              const isOpening =
                requestOverview.loadingInstanceId === row[INSTANCE_ID_KEY]
              return (
                <button
                  className='inline-flex cursor-pointer items-center gap-1.5 font-medium text-primary-10 underline-offset-2 transition-colors hover:text-primary-11 hover:underline active:opacity-70 disabled:cursor-wait'
                  disabled={Boolean(requestOverview.loadingInstanceId)}
                  type='button'
                  onClick={() => openRequest(row)}
                >
                  {(row[key] as string) || '-'}
                  {isOpening && (
                    <Icon
                      className='size-3.5 animate-spin'
                      name='lucide:loader-2'
                    />
                  )}
                </button>
              )
            }
            if (setting?.colType === 'status') {
              const status = resolveFieldStatus(
                setting,
                row as unknown as Record<string, string>,
              )
              return status ? (
                <StatusPill color={status.color} label={status.label} />
              ) : (
                (row[key] as string) || '-'
              )
            }
            const value = row[key] as string
            if (isDate && value) return formatReportDate(value)
            return value ?? '-'
          },
        }
      }),
    [
      previewColumns,
      fieldSettings, columnTypes,
      openRequest,
      requestOverview.loadingInstanceId,
    ],
  )

  const { searchState, ...restState } = useDataTableState({
    storageKey: `ezofis_report_overview_table_state_${report.id}`,
  })

  // Dummy rows for table initialization to provide column metadata to TableSearch
  const initialRows = useMemo(
    () => [
      {
        groupCount: sourceRows.length,
        groupId: 'all',
        groupKey: '',
        groupValue: '',
        items: sourceRows.map(toTableRow),
      },
    ],
    [sourceRows],
  )

  const { table } = useDataTable({
    columns,
    enableRowSelection: false,
    rows: initialRows,
    state: { searchState, ...restState },
  })

  const globalSearchState = table.getState().globalFilter as {
    id?: string
    value?: string
  }
  const search = globalSearchState?.value || ''
  const selectedColumnId = globalSearchState?.id || ''

  // Keys of the agent's default columns; their filters show inline, every
  // other column's filter sits behind the "+" field picker.
  const defaultColumnKeys = useMemo(() => {
    const spec = report.agentConfig?.reportSpec as unknown as
      | ReportSpec
      | undefined
    if (!spec) return null
    return new Set(
      [...(spec.defaultColumns ?? []), ...(spec.columns ?? [])]
        .filter((column) => column.kind === 'default')
        .map((column) => column.key),
    )
  }, [report.agentConfig])

  // Column-wise filter definitions
  const allFilterDefinitions: FilterDefinition[] = useMemo(() => {
    return previewColumns.map((col) => {
      const detectedType = columnTypes[col.id]

      let options: { count?: number; label: string; value: string }[] = []

      if (isDateColumnType(detectedType)) {
        options = generateDateRanges(sourceRows, col.id, (r) =>
          valueForColumn(col, r),
        )
      } else if (isNumberColumnType(detectedType)) {
        options = generateNumericBuckets(sourceRows, col.id, (r) =>
          valueForColumn(col, r),
        )
        if (options.length === 0) {
          options = generateCategoryOptions(sourceRows, col.id, (r) =>
            valueForColumn(col, r),
          )
        }
      } else {
        options = generateCategoryOptions(sourceRows, col.id, (r) =>
          valueForColumn(col, r),
        )
      }

      return {
        dataType: detectedType,
        id: col.id,
        label: col.label,
        options,
        searchable: true,
        searchPlaceholder: t`Search ${col.label}...`,
      }
    })
  }, [previewColumns, columnTypes, sourceRows, valueForColumn, t])

  // Manual reports have no default/other split, so all their filters stay inline.
  const isInlineFilter = useCallback(
    (id: string) => !defaultColumnKeys || defaultColumnKeys.has(id),
    [defaultColumnKeys],
  )

  const filterDefinitions = useMemo(
    () =>
      allFilterDefinitions.filter(
        (def) => def.options.length > 0 && isInlineFilter(def.id),
      ),
    [allFilterDefinitions, isInlineFilter],
  )

  const moreFilterGroups: FilterGroup[] = useMemo(
    () =>
      allFilterDefinitions
        .filter((def) => !isInlineFilter(def.id))
        .map(
          ({
            dataType,
            id,
            label,
            options,
            searchable,
            searchPlaceholder,
          }) => ({
            dataType,
            id,
            label,
            // No options → the picker falls back to a free-text filter.
            options: options.length > 0 ? options : undefined,
            searchable,
            searchPlaceholder,
          }),
        ),
    [allFilterDefinitions, isInlineFilter],
  )

  const filteredRows = useMemo(() => {
    return sourceRows.filter((row) => {
      // 1. Search Query via TableSearch (Target selected column or search across all)
      if (search) {
        const query = search.toLowerCase()
        if (selectedColumnId) {
          const col = previewColumns.find((c) => c.id === selectedColumnId)
          if (col) {
            const val = String(
              displayValueForColumn(col, row) ?? '',
            ).toLowerCase()
            if (!val.includes(query)) return false
          }
        } else {
          const matches = previewColumns.some((col) =>
            String(displayValueForColumn(col, row) ?? '')
              .toLowerCase()
              .includes(query),
          )
          if (!matches) return false
        }
      }

      // 2. Active Column Filters
      for (const col of previewColumns) {
        const rawFilterValue = activeFilters[col.id]
        if (!rawFilterValue) continue

        const rowVal = valueForColumn(col, row)
        const detectedType = columnTypes[col.id]

        if (isDateColumnType(detectedType)) {
          if (!matchesDateRangeValue(toLocalDay(rowVal), rawFilterValue))
            return false
        } else if (isNumberColumnType(detectedType)) {
          const selectedVals = parseFilterValues(rawFilterValue)
          const isMatch = selectedVals.some((sel) => {
            if (sel.includes('-')) {
              const [minStr, maxStr] = sel.split('-')
              const min = Number(minStr)
              const max = Number(maxStr)
              const num = Number(String(rowVal).replace(/[^0-9.-]/g, ''))
              if (isNaN(num)) return false
              return num >= min && num <= max
            }
            return String(rowVal) === sel
          })
          if (!isMatch) return false
        } else {
          if (!matchesCategoryFilterValue(rowVal, rawFilterValue)) return false
        }
      }

      return true
    })
  }, [
    sourceRows,
    search,
    selectedColumnId,
    activeFilters,
    previewColumns,
    valueForColumn,
    displayValueForColumn,
    columnTypes,
  ])

  const paginatedRows = useMemo(() => {
    if (pageSize === 0) return filteredRows
    const start = (page - 1) * pageSize
    return filteredRows.slice(start, start + pageSize)
  }, [filteredRows, page, pageSize])

  const displayRows = useMemo(
    () => [
      {
        groupCount: paginatedRows.length,
        groupId: 'all',
        groupKey: '',
        groupValue: '',
        items: paginatedRows.map(toTableRow),
      },
    ],
    [paginatedRows],
  )

  const { table: renderTable } = useDataTable({
    columns,
    enableRowSelection: false,
    rows: displayRows,
    state: { searchState, ...restState },
  })

  if (agentError) {
    return (
      <div className='flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-red-6 bg-red-2 p-6 text-center'>
        <p className='text-13 text-red-11'>{agentError}</p>
        <Button
          color='gray'
          icon='lucide:refresh-cw'
          label={t`Run again`}
          size='sm'
          variant='outline'
          onClick={() => void agentQuery.refetch()}
        />
      </div>
    )
  }

  if (!isLoading && previewColumns.length === 0) {
    if (isAgentReport) {
      return (
        <div className='flex min-h-0 flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-4 text-center'>
          <p className='text-13 text-gray-10'>{t`No rows for this report.`}</p>
        </div>
      )
    }
    return (
      <div className='flex min-h-0 flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-4 text-center'>
        <p className='text-13 text-gray-10'>{t`This report has no fields configured yet.`}</p>
      </div>
    )
  }

  return (
    <>
      {requestOverview.isOpen && (
        <AnimateFadeIn className='flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-3 bg-surface'>
          {/* Read-only here: reviewing happens on the Requests page. */}
          <Request
            hideActions
            item={requestOverview.item}
            key={requestOverview.item?.processId || requestOverview.item?.id}
            workflowId={requestOverview.workflowId ?? undefined}
            onBack={requestOverview.close}
          />
        </AnimateFadeIn>
      )}
      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col gap-3',
          requestOverview.isOpen && 'hidden',
        )}
      >
        <CustomFilter
          activeFilters={activeFilters}
          customSearchComponent={<TableSearch table={table as any} />}
          filters={filterDefinitions}
          moreFilters={moreFilterGroups}
          moreFiltersLabel={t`Add filter`}
          showReset={Boolean(
            search ||
            selectedColumnId ||
            Object.values(activeFilters).some(Boolean),
          )}
          trailingActions={
            <TableExport
              fileName={report.name || 'report'}
              table={renderTable as any}
            />
          }
          onFilterChange={(id, value) => {
            setActiveFilters((prev) => ({ ...prev, [id]: value }))
            setPage(1)
          }}
          onReset={() => {
            table.setGlobalFilter({ id: '', value: '' })
            setActiveFilters({})
            setPage(1)
          }}
        />

        <div className='min-h-0 flex-1 overflow-hidden rounded-xl border border-gray-3'>
          <DataTable
            isLoading={isLoading}
            isReLoading={false}
            pageSize={pageSize}
            table={renderTable}
            hideActionBar
            hideGrouping
            stickyHeader
            onReload={() => {}}
          />
        </div>

        <Pagination
          className='shrink-0'
          itemLabel={t`Rows`}
          page={page}
          pageSize={pageSize}
          showPageNumbers={false}
          totalItems={filteredRows.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </>
  )
}

OverviewTab.displayName = 'OverviewTab'
export default OverviewTab
