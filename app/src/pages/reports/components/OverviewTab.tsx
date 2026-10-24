import { useLingui } from '@lingui/react/macro'
import { useCallback, useMemo, useState } from 'react'
import type { Row } from '@/components/base/data-table/types'
import type { FilterDefinition } from '@/components/common/CustomFilter'
import type { Report } from '@/pages/report-builder/types'
import Button from '@/components/base/button/Button'
import TableExport from '@/components/base/data-table/actions/TableExport'
import TableSearch from '@/components/base/data-table/actions/TableSearch'
import DataTable from '@/components/base/data-table/DataTable'
import useDataTable from '@/components/base/data-table/hooks/useDataTable'
import useDataTableState from '@/components/base/data-table/hooks/useDataTableState'
import Pagination from '@/components/base/pagination/Pagination'
import CustomFilter from '@/components/common/CustomFilter'
import {
  useReportAgentDataQuery,
  useReportBuilderDataQuery,
} from '@/pages/report-builder/hooks/useReportBuilderApi'
import { resolveFieldStatus } from '@/pages/report-builder/utils/resolveFieldStatus'
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
import StatusPill from './StatusPill'

interface OverviewColumn {
  id: string
  label: string
}

interface Props {
  report: Report
}

const PAGE_SIZE = 10

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
  const agentError = isAgentReport ? agentQuery.error?.message : undefined
  const agentWarnings = agentQuery.data?.warnings ?? []

  // Highlights sent on the run response win over the ones saved with the report.
  const fieldSettings = useMemo(
    () => ({ ...report.fieldSettings, ...agentQuery.data?.fieldSettings }),
    [report.fieldSettings, agentQuery.data?.fieldSettings],
  )

  const previewColumns: OverviewColumn[] = useMemo(() => {
    const columns = runResult?.columns ?? []
    return columns.map((col) => {
      const fieldId = isAgentReport
        ? col.key
        : report.fields.find((id) => fieldSettings[id]?.label === col.label) ||
          col.key
      return { id: fieldId, label: col.label }
    })
  }, [runResult, isAgentReport, report.fields, fieldSettings])

  const sourceRows: Record<string, string>[] = useMemo(() => {
    const rows = runResult?.rows ?? []
    return rows.map((row) => {
      const mapped: Record<string, string> = {}
      previewColumns.forEach((col) => {
        mapped[col.id] = row[col.label] ?? ''
      })
      return mapped
    })
  }, [runResult, previewColumns])

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

  // Columns formatted for TanStack Table and TableSearch
  const columns = useMemo(
    () =>
      previewColumns.map((col) => {
        const setting = fieldSettings[col.id]
        return {
          id: col.id,
          label: col.label,
          meta: { label: col.label },
          size: 180,
          accessorFn: (row: Row) => row[col.id],
          renderCell: (row: Row) => {
            if (setting?.colType === 'status') {
              const status = resolveFieldStatus(
                setting,
                row as unknown as Record<string, string>,
              )
              return status ? (
                <StatusPill color={status.color} label={status.label} />
              ) : (
                (row[col.id] as string) || '-'
              )
            }
            return (row[col.id] as string) ?? '-'
          },
        }
      }),
    [previewColumns, fieldSettings],
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
        items: sourceRows.map((row, index) => ({
          ...row,
          id: String(index),
          name: '',
        })),
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

  // Column-wise filter definitions
  const filterDefinitions: FilterDefinition[] = useMemo(() => {
    return previewColumns
      .map((col) => {
        const setting = fieldSettings[col.id]
        const isStatus = setting?.colType === 'status'
        const detectedType = isStatus
          ? 'category'
          : detectFieldType(sourceRows, col.id, (r) => valueForColumn(col, r))

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
      .filter((def) => def.options.length > 0)
  }, [previewColumns, fieldSettings, sourceRows, valueForColumn, t])

  const filteredRows = useMemo(() => {
    return sourceRows.filter((row) => {
      // 1. Search Query via TableSearch (Target selected column or search across all)
      if (search) {
        const query = search.toLowerCase()
        if (selectedColumnId) {
          const col = previewColumns.find((c) => c.id === selectedColumnId)
          if (col) {
            const val = String(valueForColumn(col, row) ?? '').toLowerCase()
            if (!val.includes(query)) return false
          }
        } else {
          const matches = previewColumns.some((col) =>
            String(valueForColumn(col, row) ?? '')
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
        const setting = fieldSettings[col.id]
        const isStatus = setting?.colType === 'status'
        const detectedType = isStatus
          ? 'category'
          : detectFieldType(sourceRows, col.id, (r) => valueForColumn(col, r))

        if (isDateColumnType(detectedType)) {
          if (!matchesDateRangeValue(rowVal, rawFilterValue)) return false
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
    fieldSettings,
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
        items: paginatedRows.map((row, index) => ({
          ...row,
          id: String(index),
          name: '',
        })),
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
    <div className='flex min-h-0 flex-1 flex-col gap-3'>
      {agentWarnings.length > 0 && (
        <div className='flex flex-col gap-1 rounded-lg border border-yellow-6 bg-yellow-2 px-3 py-2'>
          {agentWarnings.map((warning) => (
            <p className='text-12 text-yellow-11' key={warning}>
              {warning}
            </p>
          ))}
        </div>
      )}
      <CustomFilter
        activeFilters={activeFilters}
        customSearchComponent={<TableSearch table={table as any} />}
        filters={filterDefinitions}
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
  )
}

OverviewTab.displayName = 'OverviewTab'
export default OverviewTab
