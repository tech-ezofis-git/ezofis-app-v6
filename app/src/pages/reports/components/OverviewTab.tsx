import { useLingui } from '@lingui/react/macro'
import { useMemo, useState } from 'react'
import type { Row } from '@/components/base/data-table/types'
import type { Report } from '@/pages/report-builder/types'
import TableExport from '@/components/base/data-table/actions/TableExport'
import DataTable from '@/components/base/data-table/DataTable'
import useDataTable from '@/components/base/data-table/hooks/useDataTable'
import useDataTableState from '@/components/base/data-table/hooks/useDataTableState'
import Pagination from '@/components/base/pagination/Pagination'
import CustomFilter from '@/components/common/CustomFilter'
import { useReportBuilderDataQuery } from '@/pages/report-builder/hooks/useReportBuilderApi'
import { resolveFieldStatus } from '@/pages/report-builder/utils/resolveFieldStatus'
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
  const [search, setSearch] = useState('')
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({})
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)

  const { data: runResult, isLoading } = useReportBuilderDataQuery(report.id)

  // The API keys columns/rows by label (see guide §7: "rows[] keys are the
  // column labels, not GUIDs and not fields[].id"). Re-key each row by the
  // internal field id so the existing status/calc lookups (which index
  // fieldSettings by id) keep working unchanged.
  const previewColumns: OverviewColumn[] = useMemo(() => {
    const columns = runResult?.columns ?? []
    return columns.map((col) => {
      const fieldId =
        report.fields.find(
          (id) => report.fieldSettings[id]?.label === col.label,
        ) || col.key
      return { id: fieldId, label: col.label }
    })
  }, [runResult, report.fields, report.fieldSettings])

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

  // Any column whose values are categorical (a computed-status column) gets
  // its own filter dropdown, built from the distinct values actually present
  // in the row data.
  const filterableColumns = useMemo(
    () =>
      previewColumns.filter(
        (col) => report.fieldSettings[col.id]?.colType === 'status',
      ),
    [previewColumns, report.fieldSettings],
  )

  const valueForColumn = (col: OverviewColumn, row: Record<string, string>) => {
    const setting = report.fieldSettings[col.id]
    if (setting?.colType === 'status') {
      return resolveFieldStatus(setting, row)?.label
    }
    return row[col.id]
  }

  const filterDefinitions = useMemo(
    () =>
      filterableColumns.map((col) => {
        const labels = new Set(
          sourceRows
            .map((row) => valueForColumn(col, row))
            .filter((label): label is string => Boolean(label)),
        )
        return {
          id: col.id,
          label: col.label,
          options: Array.from(labels).map((label) => ({
            label,
            value: label,
          })),
        }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- valueForColumn is a stable closure over report/args passed explicitly
    [filterableColumns, sourceRows],
  )

  const filteredRows = useMemo(() => {
    return sourceRows.filter((row) => {
      for (const col of filterableColumns) {
        const activeValue = activeFilters[col.id]
        if (activeValue && valueForColumn(col, row) !== activeValue) {
          return false
        }
      }
      if (search) {
        const query = search.toLowerCase()
        const matches = previewColumns.some((col) =>
          String(row[col.id] ?? '')
            .toLowerCase()
            .includes(query),
        )
        if (!matches) return false
      }
      return true
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- valueForColumn is a stable closure over report/args passed explicitly
  }, [sourceRows, search, filterableColumns, activeFilters, previewColumns])

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredRows.slice(start, start + pageSize)
  }, [filteredRows, page, pageSize])

  const rows = useMemo(
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

  const columns = useMemo(
    () =>
      previewColumns.map((col) => {
        const setting = report.fieldSettings[col.id]
        return {
          id: col.id,
          label: col.label,
          size: 180,
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
    [previewColumns, report.fieldSettings],
  )

  const { searchState, ...restState } = useDataTableState({
    storageKey: `ezofis_report_overview_table_state_${report.id}`,
  })
  const { table } = useDataTable({
    columns,
    enableRowSelection: false,
    rows,
    state: { searchState, ...restState },
  })

  if (!isLoading && previewColumns.length === 0) {
    return (
      <div className='flex min-h-0 flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-4 text-center'>
        <p className='text-13 text-gray-10'>{t`This report has no fields configured yet.`}</p>
      </div>
    )
  }

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-3'>
      <CustomFilter
        activeFilters={activeFilters}
        filters={filterDefinitions}
        searchPlaceholder={t`Search rows...`}
        searchQuery={search}
        showReset={Boolean(
          search || Object.values(activeFilters).some(Boolean),
        )}
        trailingActions={
          <TableExport fileName={report.name || 'report'} table={table} />
        }
        onFilterChange={(id, value) => {
          setActiveFilters((prev) => ({ ...prev, [id]: value }))
          setPage(1)
        }}
        onReset={() => {
          setSearch('')
          setActiveFilters({})
          setPage(1)
        }}
        onSearchChange={(value) => {
          setSearch(value)
          setPage(1)
        }}
      />

      <div className='min-h-0 flex-1 overflow-hidden rounded-xl border border-gray-3'>
        <DataTable
          isLoading={isLoading}
          isReLoading={false}
          pageSize={pageSize}
          table={table}
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
