import { useLingui } from '@lingui/react/macro'
import { useMemo, useState } from 'react'
import type { Row } from '@/components/base/data-table/types'
import type { Question } from '@/pages/form-builder/store/formStore'
import type { ReportDomain } from '@/pages/report-builder/constants'
import type { Report } from '@/pages/report-builder/types'
import type { PreviewColumn } from '@/pages/report-builder/utils/previewSampleData'
import TableExport from '@/components/base/data-table/actions/TableExport'
import DataTable from '@/components/base/data-table/DataTable'
import useDataTable from '@/components/base/data-table/hooks/useDataTable'
import useDataTableState from '@/components/base/data-table/hooks/useDataTableState'
import Pagination from '@/components/base/pagination/Pagination'
import CustomFilter from '@/components/common/CustomFilter'
import { DOMAIN_FIELDS, SAMPLE_ROWS } from '@/pages/report-builder/constants'
import useReportSourceFields from '@/pages/report-builder/hooks/useReportSourceFields'
import {
  buildSampleRows,
  sampleTypeForDomainFieldType,
  sampleTypeForQuestionType,
} from '@/pages/report-builder/utils/previewSampleData'
import { resolveFieldStatus } from '@/pages/report-builder/utils/resolveFieldStatus'
import StatusPill from './StatusPill'

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

  const hasDynamicSource = Boolean(
    report.sourceFormId || report.sourceId || report.sourceType,
  )
  const { fields: sourceFields } = useReportSourceFields(
    report.sourceFormId || report.sourceId || '',
    report.sourceType,
    report.sourceId,
  )

  const previewColumns: PreviewColumn[] = useMemo(() => {
    if (hasDynamicSource || sourceFields.length > 0) {
      const allFields: Question[] = [
        ...sourceFields,
        ...(report.customFields ?? []),
      ]
      return report.fields
        .map((fieldId) => {
          const field = allFields.find((f) => f.id === fieldId)
          if (!field) return null
          const setting = report.fieldSettings[fieldId]
          return {
            id: fieldId,
            label: setting?.label || field.label,
            sampleType: sampleTypeForQuestionType(field.type),
          }
        })
        .filter((c): c is PreviewColumn => Boolean(c))
    }

    const domainFields = DOMAIN_FIELDS[report.domain as ReportDomain] || []
    return report.fields
      .map((fieldId) => {
        const field = domainFields.find((f) => f.id === fieldId)
        if (!field) return null
        const setting = report.fieldSettings[fieldId]
        return {
          id: fieldId,
          label: setting?.label || field.label,
          sampleType: sampleTypeForDomainFieldType(field.type),
        }
      })
      .filter((c): c is PreviewColumn => Boolean(c))
  }, [
    hasDynamicSource,
    sourceFields,
    report.customFields,
    report.fields,
    report.fieldSettings,
    report.domain,
  ])

  const sourceRows: Record<string, string>[] = useMemo(() => {
    if (hasDynamicSource || sourceFields.length > 0)
      return buildSampleRows(previewColumns)
    return SAMPLE_ROWS[report.domain as ReportDomain] || []
  }, [hasDynamicSource, sourceFields.length, previewColumns, report.domain])

  // Any column whose values are categorical (a computed-status column, or a
  // Choice/Select-typed source field) gets its own filter dropdown, built
  // from the distinct values actually present in the row data.
  const filterableColumns = useMemo(
    () =>
      previewColumns.filter(
        (col) =>
          report.fieldSettings[col.id]?.colType === 'status' ||
          col.sampleType === 'choice',
      ),
    [previewColumns, report.fieldSettings],
  )

  const valueForColumn = (col: PreviewColumn, row: Record<string, string>) => {
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

  if (previewColumns.length === 0) {
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
          isLoading={false}
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
