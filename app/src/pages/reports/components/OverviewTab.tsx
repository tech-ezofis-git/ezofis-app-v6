import { useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { animate, motion } from 'motion/react'
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { ReportSpec } from '@/api/v6/reportAgent'
import type { Row } from '@/components/base/data-table/types'
import type {
  FilterDefinition,
  FilterGroup,
} from '@/components/common/CustomFilter'
import type { Report } from '@/pages/report-builder/types'
import { getRepositoriesQueryOptions } from '@/api/folders/queries'
import IconButton from '@/components/base/button/IconButton'
import TableExport from '@/components/base/data-table/actions/TableExport'
import TableSearch from '@/components/base/data-table/actions/TableSearch'
import DataTable from '@/components/base/data-table/DataTable'
import useDataTable from '@/components/base/data-table/hooks/useDataTable'
import useDataTableState from '@/components/base/data-table/hooks/useDataTableState'
import Icon from '@/components/base/icon/Icon'
import Modal from '@/components/base/Modal'
import Pagination from '@/components/base/pagination/Pagination'
import showToast from '@/components/base/toast/showToast'
import { AnimateFadeIn } from '@/components/common/animations'
import CustomFilter from '@/components/common/CustomFilter'
import PageEmptyState from '@/components/common/PageEmptyState'
import { DocumentDetailsView } from '@/pages/folders/components/DocumentDetailsView'
import {
  useReportAgentDataQuery,
  useReportBuilderDataQuery,
} from '@/pages/report-builder/hooks/useReportBuilderApi'
import { DEFAULT_REPORT_DOMAIN } from '@/pages/report-builder/utils/agentReport'
import {
  isHiddenReportColumn,
  isIdColumn,
} from '@/pages/report-builder/utils/hiddenColumns'
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
import JsonValueTable, {
  JsonCellButton,
  parseJsonValue,
} from './JsonValueTable'
import StatusPill from './StatusPill'
import UserActivityModal from './UserActivityModal'

interface OverviewColumn {
  id: string
  label: string
}

interface Props {
  report: Report
  /** Extra buttons at the end of the filter bar (e.g. Share). */
  toolbarActions?: React.ReactNode
}

const PAGE_SIZE = 200

// Row fields (not table columns) carrying the ids a Req No link opens.
const WORKFLOW_ID_KEY = '__workflowId'
const INSTANCE_ID_KEY = '__instanceId'

// Normalized names the run may use for those ids.
const WORKFLOW_ID_NAMES = ['workflowid', 'wfid']
const INSTANCE_ID_NAMES = ['instanceid', 'workflowinstanceid', 'processid']

// Row fields carrying the ids a folder report's file-name link opens.
const FILE_ITEM_ID_KEY = '__fileItemId'
const FILE_REPOSITORY_ID_KEY = '__fileRepositoryId'

const ITEM_ID_NAMES = ['itemid', 'fileid', 'documentid', 'docid']
const REPOSITORY_ID_NAMES = ['repositoryid', 'repoid']
const FILE_NAME_NAMES = [
  'document',
  'documentname',
  'file',
  'filename',
  'itemname',
  'name',
  'title',
]

const normalizeName = (value: string | undefined) =>
  (value ?? '').toLowerCase().replace(/[\s_\-.#]/g, '')

// Columns a report's totals are split by (normalized names).
// Filters shown inline (one row); the rest are added from the "+" picker.
const MAX_INLINE_FILTERS = 4
// A column with more distinct values than this isn't a quick filter.
const MAX_INLINE_FILTER_OPTIONS = 25

const BREAKDOWN_COLUMN_NAMES = ['agent', 'skill', 'activity', 'activitytype']

const toNumber = (value: unknown) => {
  const num = Number(String(value ?? '').replace(/[^0-9.-]/g, ''))
  return Number.isFinite(num) ? num : 0
}

// Small totals (AI cost in USD, e.g. 0.000223) keep their digits instead of
// rounding to 0.
const formatTotal = (value: number) =>
  value.toLocaleString(undefined, {
    maximumFractionDigits: value !== 0 && Math.abs(value) < 1 ? 6 : 2,
  })

// View, download and print only; editing and workflow actions stay on the
// Folders page.
const READ_ONLY_FILE_PERMISSIONS = {
  checkIn: false,
  checkOut: false,
  delete: false,
  download: true,
  editDocument: false,
  editMetadata: false,
  piiRedaction: false,
  print: true,
  sendForSignature: false,
  upload: false,
  view: true,
}

const isFileNameColumn = (col: OverviewColumn) =>
  FILE_NAME_NAMES.includes(normalizeName(col.id)) ||
  FILE_NAME_NAMES.includes(normalizeName(col.label))

/** The request-number column: key `id` (labelled "Req No") or a Req/Request No label. */
const isRequestNumberColumn = (col: OverviewColumn) =>
  normalizeName(col.id) === 'id' ||
  /^(req|request)(no|num|number)$/.test(normalizeName(col.label))

/** A default report's Source column: a request's workflow or a repository file's folder. */
const isSourceColumn = (col: OverviewColumn) =>
  normalizeName(col.label) === 'source'

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

/** Counts up from 0 to `value` when shown (the pop-up's total). */
const CountUp = ({ value }: { value: number }) => {
  const [shown, setShown] = useState(0)
  useEffect(() => {
    const controls = animate(0, value, {
      duration: 0.8,
      ease: 'easeOut',
      onUpdate: (latest) => setShown(latest),
    })
    return () => controls.stop()
  }, [value])
  return <>{formatTotal(Math.round(shown))}</>
}

const OverviewTab = ({ report, toolbarActions }: Props) => {
  const { t } = useLingui()
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({})
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)

  const isAgentReport = Boolean(report.agentConfig)
  const isFolderReport = report.sourceType === 'Folder'
  const isDefaultReport = report.domain === DEFAULT_REPORT_DOMAIN
  // User Login and Security Activity: a user's row opens their logins / events.
  const isLoginReport =
    isDefaultReport &&
    (report.agentConfig?.reportSpec as unknown as ReportSpec | undefined)
      ?.agentSpec?.template === 'user_login_security'
  const [activityEmail, setActivityEmail] = useState<string | null>(null)
  // Pending Workflow Requests shows one workflow at a time (Accounts Payable
  // first); the Workflow filter picks another.
  const isPendingReport =
    isDefaultReport &&
    (report.agentConfig?.reportSpec as unknown as ReportSpec | undefined)
      ?.agentSpec?.template === 'pending_workflow_requests'
  const legacyQuery = useReportBuilderDataQuery(
    isAgentReport ? null : report.id,
  )
  const agentQuery = useReportAgentDataQuery(report)
  const runResult = isAgentReport ? agentQuery.data?.result : legacyQuery.data
  const isLoading = isAgentReport ? agentQuery.isLoading : legacyQuery.isLoading
  const isFetching = isAgentReport
    ? agentQuery.isFetching
    : legacyQuery.isFetching
  const runError = (isAgentReport ? agentQuery.error : legacyQuery.error)
    ?.message

  // Agent reports: Refresh also brings the saved report's default columns up to date.
  const refresh = () =>
    void (isAgentReport
      ? agentQuery.refreshWithDefaults()
      : legacyQuery.refetch())

  // Highlights sent on the run response win over the ones saved with the report.
  const fieldSettings = useMemo(
    () => ({ ...report.fieldSettings, ...agentQuery.data?.fieldSettings }),
    [report.fieldSettings, agentQuery.data?.fieldSettings],
  )

  const previewColumns: OverviewColumn[] = useMemo(() => {
    const columns = runResult?.columns ?? []
    return (
      columns
        // Internal identifier columns are fetched but never displayed. Default
        // reports span every workflow/folder, so their Workflow / Repository
        // column is real data there, not the report's own source name.
        .filter((col) =>
          report.domain === DEFAULT_REPORT_DOMAIN
            ? !isIdColumn(col.key, col.label)
            : !isHiddenReportColumn(col.key, col.label),
        )
        .map((col) => {
          const fieldId = isAgentReport
            ? col.key
            : report.fields.find(
                (id) => fieldSettings[id]?.label === col.label,
              ) || col.key
          return { id: fieldId, label: col.label }
        })
    )
  }, [runResult, isAgentReport, report.fields, report.domain, fieldSettings])

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
      item: find(isFolderReport ? [...ITEM_ID_NAMES, 'id'] : ITEM_ID_NAMES),
      repository: find(REPOSITORY_ID_NAMES),
      workflow: find(WORKFLOW_ID_NAMES),
    }
  }, [runResult, isFolderReport])

  // Single-folder reports may not return a repository id per row; resolve the
  // report's folder by name instead.
  const repositoriesQuery = useQuery({
    ...getRepositoriesQueryOptions(),
    enabled: isFolderReport,
  })
  const reportRepositoryId = useMemo(() => {
    const name = normalizeName(
      report.agentConfig?.repositoryName || report.domain,
    )
    const match = (repositoriesQuery.data ?? []).find(
      (repo: { id: unknown; name: unknown }) =>
        normalizeName(String(repo.name)) === name,
    )
    return match ? String(match.id) : ''
  }, [repositoriesQuery.data, report.agentConfig, report.domain])

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
      // Folder reports link every file; other reports (e.g. AI credits) link
      // the rows that carry a file's item and repository ids.
      mapped[FILE_ITEM_ID_KEY] = read(row, ITEM_ID_NAMES, linkColumns.item)
      mapped[FILE_REPOSITORY_ID_KEY] =
        read(row, REPOSITORY_ID_NAMES, linkColumns.repository) ||
        (isFolderReport ? reportRepositoryId : '')
      return mapped
    })
  }, [
    runResult,
    previewColumns,
    linkColumns,
    isFolderReport,
    reportRepositoryId,
  ])

  // A folder report's file opens in place of the table, in the same details
  // view the Folders page uses.
  // A JSON cell's data, shown as a table in place of the report table.
  const [jsonView, setJsonView] = useState<{
    label: string
    value: NonNullable<ReturnType<typeof parseJsonValue>>
  } | null>(null)

  const [openFile, setOpenFile] = useState<{
    fileName: string
    id: string
    repositoryId: string
  } | null>(null)

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
            // A highlighted link cell (file name, Req No) keeps its link,
            // inside the highlight color.
            const status =
              setting?.colType === 'status'
                ? resolveFieldStatus(
                    setting,
                    row as unknown as Record<string, string>,
                  )
                : null
            const highlighted = (content: ReactNode) =>
              status ? (
                <StatusPill color={status.color} label={status.label}>
                  {content}
                </StatusPill>
              ) : (
                content
              )
            if (
              (isFolderReport
                ? isFileNameColumn(col)
                : isRequestNumberColumn(col) && !row[INSTANCE_ID_KEY]) &&
              row[FILE_ITEM_ID_KEY] &&
              row[FILE_REPOSITORY_ID_KEY]
            ) {
              return highlighted(
                <button
                  className='cursor-pointer truncate font-medium text-primary-10 underline-offset-2 transition-colors hover:text-primary-11 hover:underline active:opacity-70'
                  type='button'
                  onClick={() =>
                    setOpenFile({
                      fileName: String(row[key] ?? ''),
                      id: String(row[FILE_ITEM_ID_KEY]),
                      repositoryId: String(row[FILE_REPOSITORY_ID_KEY]),
                    })
                  }
                >
                  {(row[key] as string) || '-'}
                </button>,
              )
            }
            if (
              !isFolderReport &&
              isRequestNumberColumn(col) &&
              row[WORKFLOW_ID_KEY] &&
              row[INSTANCE_ID_KEY]
            ) {
              const isOpening =
                requestOverview.loadingInstanceId === row[INSTANCE_ID_KEY]
              return highlighted(
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
                </button>,
              )
            }
            const json = parseJsonValue(row[key])
            if (json) {
              return (
                <JsonCellButton
                  value={json}
                  onClick={() => setJsonView({ label: col.label, value: json })}
                />
              )
            }
            if (setting?.colType === 'status') {
              return status ? (
                <StatusPill color={status.color} label={status.label} />
              ) : (
                (row[key] as string) || '-'
              )
            }
            const value = row[key] as string
            if (isLoginReport && normalizeName(col.label) === 'user' && value) {
              return (
                <button
                  className='cursor-pointer truncate font-medium text-primary-10 underline-offset-2 transition-colors hover:text-primary-11 hover:underline active:opacity-70'
                  type='button'
                  onClick={() => setActivityEmail(String(value))}
                >
                  {value}
                </button>
              )
            }
            // Source names a workflow (request rows) or a folder (repository
            // files: OCR, intelligent upload, AI summary); the icon tells which.
            if (isDefaultReport && isSourceColumn(col)) {
              const isFile = Boolean(row[FILE_REPOSITORY_ID_KEY])
              if (isFile || row[WORKFLOW_ID_KEY]) {
                return (
                  <span className='inline-flex min-w-0 items-center gap-1.5'>
                    <Icon
                      className='size-3.5 shrink-0 text-gray-9'
                      name={isFile ? 'lucide:folder' : 'lucide:workflow'}
                    />
                    <span className='truncate'>{value || '-'}</span>
                  </span>
                )
              }
            }
            if (isDate && value) return formatReportDate(value)
            return value ?? '-'
          },
        }
      }),
    [
      previewColumns,
      fieldSettings,
      columnTypes,
      openRequest,
      requestOverview.loadingInstanceId,
      isFolderReport,
      isDefaultReport,
      isLoginReport,
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

  // One row of inline filters: the first few columns with a short list of
  // values (Workflow, Status, Stage...). Columns with near-unique values
  // (Request No), dates and numbers go behind the "+" picker with the rest.
  // Manual reports have no default/other split, so any column may be inline.
  const inlineFilterIds = useMemo(() => {
    const candidates = allFilterDefinitions.filter(
      (def) =>
        def.options.length > 0 &&
        (!defaultColumnKeys || defaultColumnKeys.has(def.id)),
    )
    const isShortList = (def: FilterDefinition) =>
      !isDateColumnType(def.dataType) &&
      !isNumberColumnType(def.dataType) &&
      def.options.length <= MAX_INLINE_FILTER_OPTIONS
    return new Set(
      [
        ...candidates.filter(isShortList),
        ...candidates.filter((def) => !isShortList(def)),
      ]
        .slice(0, MAX_INLINE_FILTERS)
        .map((def) => def.id),
    )
  }, [allFilterDefinitions, defaultColumnKeys])

  const isInlineFilter = useCallback(
    (id: string) => inlineFilterIds.has(id),
    [inlineFilterIds],
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

  // Pending Workflow Requests: with no workflow picked, Accounts Payable (or
  // the first workflow when there is none), so the report never lists all.
  const filters = useMemo(() => {
    if (!isPendingReport) return activeFilters
    const workflow = allFilterDefinitions.find(
      (def) => normalizeName(def.label) === 'workflow',
    )
    if (!workflow || workflow.options.length === 0 || activeFilters[workflow.id])
      return activeFilters
    const preferred =
      workflow.options.find((o) => /payable/i.test(o.label)) ??
      workflow.options[0]
    return { ...activeFilters, [workflow.id]: preferred.value }
  }, [isPendingReport, activeFilters, allFilterDefinitions])

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
        const rawFilterValue = filters[col.id]
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
    filters,
    previewColumns,
    valueForColumn,
    displayValueForColumn,
    columnTypes,
  ])

  // Totals of the columns the run marks "Sum" (e.g. Credits), over the
  // filtered rows so they follow the search and filters.
  const columnTotals = useMemo(() => {
    const sumKeys = new Set(
      (runResult?.columns ?? [])
        .filter((col) => col.calc === 'Sum')
        .flatMap((col) => [col.key, col.label]),
    )
    return previewColumns
      .filter((col) => sumKeys.has(col.id) || sumKeys.has(col.label))
      .map((col) => ({
        id: col.id,
        label: col.label,
        total: filteredRows.reduce(
          (sum, row) => sum + toNumber(row[col.id]),
          0,
        ),
      }))
  }, [runResult, previewColumns, filteredRows])

  // The last summed column (e.g. Credits) split by a Skill / Activity column,
  // when the report has one.
  const totalsBreakdown = useMemo(() => {
    const measure = columnTotals[columnTotals.length - 1]
    const by = previewColumns.find((col) =>
      BREAKDOWN_COLUMN_NAMES.includes(normalizeName(col.label)),
    )
    if (!measure || !by) return null
    const sums = new Map<string, number>()
    filteredRows.forEach((row) => {
      const name = String(row[by.id] || '-')
      sums.set(name, (sums.get(name) ?? 0) + toNumber(row[measure.id]))
    })
    return {
      by: by.label,
      items: [...sums.entries()]
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name)),
      measure: measure.label,
    }
  }, [columnTotals, previewColumns, filteredRows])

  // A default report with one total (AI Credit Consumption: Credits) shows it
  // in the toolbar instead of a Totals row.
  const totalsInToolbar = isDefaultReport && columnTotals.length === 1
  // The toolbar total opens its split (e.g. Credits by Agent) in a pop-up.
  const [showBreakdown, setShowBreakdown] = useState(false)
  const canShowBreakdown = Boolean(
    totalsInToolbar && totalsBreakdown && totalsBreakdown.items.length > 0,
  )

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

  // Same full-page empty state the rest of the app uses for failures.
  if (runError) {
    return (
      <PageEmptyState
        description={runError}
        icon='lucide:circle-alert'
        primaryActionLabel={t`Retry`}
        title={t`Something went wrong`}
        onPrimaryAction={refresh}
      />
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
            item={requestOverview.item}
            key={requestOverview.item?.processId || requestOverview.item?.id}
            workflowId={requestOverview.workflowId ?? undefined}
            hideActions
            onBack={requestOverview.close}
          />
        </AnimateFadeIn>
      )}
      {openFile && (
        <AnimateFadeIn className='flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-3 bg-surface'>
          {/* Read-only here, like a request opened from a report. */}
          <DocumentDetailsView
            fileName={openFile.fileName}
            id={openFile.id}
            key={`${openFile.repositoryId}:${openFile.id}`}
            permissions={READ_ONLY_FILE_PERMISSIONS}
            repositoryId={openFile.repositoryId}
            compactActions
            onBack={() => setOpenFile(null)}
          />
        </AnimateFadeIn>
      )}
      {jsonView && (
        <AnimateFadeIn className='flex min-h-0 flex-1 flex-col gap-3 overflow-hidden'>
          <div className='flex shrink-0 items-center gap-2'>
            <IconButton
              ariaLabel={t`Back to report`}
              color='gray'
              icon='lucide:arrow-left'
              size='sm'
              variant='ghost'
              onClick={() => setJsonView(null)}
            />
            <Icon className='size-4 text-primary-10' name='lucide:table-2' />
            <p className='truncate text-14 font-semibold text-gray-13'>
              {jsonView.label}
            </p>
          </div>
          <div className='ez-scrollbar min-h-0 flex-1 overflow-auto'>
            <JsonValueTable value={jsonView.value} />
          </div>
        </AnimateFadeIn>
      )}
      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col gap-3',
          (requestOverview.isOpen || openFile || jsonView) && 'hidden',
        )}
      >
        <CustomFilter
          activeFilters={filters}
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
            <div className='flex items-center gap-2'>
              <IconButton
                ariaLabel={t`Refresh`}
                color='gray'
                disabled={isFetching}
                icon='lucide:refresh-cw'
                iconClass={cn(isFetching && 'animate-spin')}
                tooltip={t`Run the report again`}
                variant='outline'
                onClick={refresh}
              />
              <TableExport
                fileName={report.name || 'report'}
                table={renderTable as any}
              />
              {totalsInToolbar &&
                filteredRows.length > 0 &&
                columnTotals.map(({ label, total }) => (
                  <button
                    disabled={!canShowBreakdown}
                    key={label}
                    type='button'
                    className={cn(
                      'inline-flex h-9 items-center gap-2 rounded-lg border border-primary-4 bg-gradient-to-r from-primary-1 to-primary-2 px-3 shadow-xs',
                      canShowBreakdown
                        ? 'cursor-pointer transition-colors hover:border-primary-6 active:opacity-80'
                        : 'cursor-default',
                    )}
                    title={
                      canShowBreakdown && totalsBreakdown
                        ? t`${totalsBreakdown.measure} by ${totalsBreakdown.by}`
                        : undefined
                    }
                    onClick={() => setShowBreakdown(true)}
                  >
                    <span className='text-13 font-bold text-primary-11'>
                      {t`Total ${label}`}
                    </span>
                    <span className='text-15 font-bold text-primary-11'>
                      {formatTotal(total)}
                    </span>
                    {canShowBreakdown && (
                      <Icon
                        className='size-3.5 text-primary-10'
                        name='lucide:chevron-down'
                      />
                    )}
                  </button>
                ))}
              {canShowBreakdown && totalsBreakdown && (
                <Modal
                  opened={showBreakdown}
                  width={440}
                  onClose={() => setShowBreakdown(false)}
                >
                  <div className='p-5'>
                    <div className='flex items-start gap-3'>
                      <div className='flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-2 text-primary-11'>
                        <Icon className='size-5' name='lucide:coins' />
                      </div>
                      <div className='min-w-0 flex-1'>
                        <h3 className='text-15 font-semibold text-gray-13'>
                          {t`${totalsBreakdown.measure} by ${totalsBreakdown.by}`}
                        </h3>
                        <p className='mt-0.5 text-13 text-gray-11'>
                          {t`Total ${totalsBreakdown.measure}`}{' '}
                          <span className='font-semibold text-gray-13'>
                            <CountUp value={columnTotals[0]?.total ?? 0} />
                          </span>
                        </p>
                      </div>
                      <IconButton
                        ariaLabel={t`Close`}
                        color='gray'
                        icon='lucide:x'
                        size='sm'
                        variant='ghost'
                        onClick={() => setShowBreakdown(false)}
                      />
                    </div>
                    <ul className='ez-scrollbar mt-4 flex max-h-96 flex-col gap-3 overflow-y-auto pr-1'>
                      {totalsBreakdown.items.map(({ name, total }, index) => {
                        const grand = columnTotals[0]?.total || 0
                        const share = grand > 0 ? (total / grand) * 100 : 0
                        // Rows slide in one after another; each bar then grows to its share.
                        const delay = 0.05 * index
                        return (
                          <motion.li
                            animate={{ opacity: 1, y: 0 }}
                            initial={{ opacity: 0, y: 8 }}
                            key={name}
                            transition={{
                              delay,
                              duration: 0.25,
                              ease: 'easeOut',
                            }}
                          >
                            <div className='flex items-center justify-between gap-3 text-13'>
                              <span className='truncate text-gray-12'>
                                {name}
                              </span>
                              <span className='shrink-0 text-gray-11'>
                                <span className='font-semibold text-gray-13'>
                                  {formatTotal(total)}
                                </span>{' '}
                                ({share.toFixed(share >= 10 ? 0 : 1)}%)
                              </span>
                            </div>
                            <div className='mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-3'>
                              <motion.div
                                animate={{ width: `${Math.max(share, 2)}%` }}
                                className='h-full rounded-full bg-primary-9'
                                initial={{ width: 0 }}
                                transition={{
                                  delay: delay + 0.15,
                                  duration: 0.6,
                                  ease: 'easeOut',
                                }}
                              />
                            </div>
                          </motion.li>
                        )
                      })}
                    </ul>
                  </div>
                </Modal>
              )}
              {toolbarActions}
            </div>
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

        {columnTotals.length > 0 &&
          filteredRows.length > 0 &&
          (!totalsInToolbar ||
            (totalsBreakdown && totalsBreakdown.items.length > 1)) && (
            // Label column + chips column, so both rows' chips start at the same edge.
            <div className='grid shrink-0 grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 rounded-lg border border-[var(--border-default)] bg-surface p-2.5 shadow-xs'>
              {/* A toolbar total (Total Credits) is not repeated here. */}
              {!totalsInToolbar && (
                <>
                  <span className='text-12 text-gray-11'>{t`Totals:`}</span>
                  <div className='flex flex-wrap items-center gap-2'>
                    {columnTotals.map(({ label, total }) => (
                      <span
                        className='inline-flex items-center gap-1.5 rounded-full bg-primary-1 px-3 py-1 text-13 text-primary-11'
                        key={label}
                      >
                        {t`Total ${label}`}
                        <span className='font-semibold'>
                          {formatTotal(total)}
                        </span>
                      </span>
                    ))}
                  </div>
                </>
              )}
              {totalsBreakdown && totalsBreakdown.items.length > 1 && (
                <>
                  <span className='text-12 text-gray-11'>
                    {t`${totalsBreakdown.measure} by ${totalsBreakdown.by}:`}
                  </span>
                  <div className='flex flex-wrap items-center gap-2 text-12 text-gray-11'>
                    {totalsBreakdown.items.map(({ name, total }) => (
                      <span
                        className='inline-flex items-center gap-1 rounded-full border border-gray-4 px-2.5 py-0.5'
                        key={name}
                      >
                        {name}
                        <span className='font-semibold text-gray-13'>
                          {formatTotal(total)}
                        </span>
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

        {isLoginReport && (
          <UserActivityModal
            email={activityEmail}
            reportId={report.id}
            onClose={() => setActivityEmail(null)}
          />
        )}

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
