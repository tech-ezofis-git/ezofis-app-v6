import { useLingui } from '@lingui/react/macro'
import { useMediaQuery } from '@mantine/hooks'
import { useMemo, useState } from 'react'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import { formatRuntimeFieldDisplayValue } from '@/pages/form-builder/helpers/runtimeFieldAdapter'
import {
  isFileColumnType,
  toFileList,
} from '@/pages/form-builder/helpers/tableColumnFiles'
import cn from '@/utils/cn'
import { formatAnswer, type FormControl } from '../helpers/portalForm'

type Attachment = Record<string, unknown>

type PortalTableFieldProps = {
  attachments?: Attachment[]
  field: FormControl
  label: string
  value: unknown
  onOpenAttachment?: (attachment: Attachment) => void
}

type TableColumnDef = FormControl & {
  id: string
  label?: string
  name?: string
  type?: string
}

const NUMERIC_TYPES = new Set(['NUMBER', 'CURRENCY_AMOUNT', 'CALCULATED'])

type ColumnSettings = {
  general?: { displayLabel?: string; visibility?: string }
  specific?: { tableColumns?: TableColumnDef[] }
}

const settingsOf = (control: FormControl): ColumnSettings =>
  control.settings && typeof control.settings === 'object'
    ? (control.settings as ColumnSettings)
    : {}

const parseRows = (value: unknown): Record<string, unknown>[] => {
  let target = value
  if (typeof target === 'string') {
    try {
      target = JSON.parse(target)
    } catch {
      return []
    }
  }
  if (!Array.isArray(target)) return []
  return target.filter(
    (row): row is Record<string, unknown> =>
      Boolean(row) && typeof row === 'object' && !Array.isArray(row),
  )
}

const columnLabel = (column: TableColumnDef) => {
  const general = settingsOf(column).general || {}
  return String(
    general.displayLabel || column.name || column.label || column.id,
  )
}

const isNumericColumn = (column: TableColumnDef) =>
  NUMERIC_TYPES.has(String(column.type || '').toUpperCase())

const cellValue = (row: Record<string, unknown>, column: TableColumnDef) =>
  row[column.id] ?? (column.name ? row[String(column.name)] : undefined)

const cellText = (raw: unknown, column: TableColumnDef) => {
  const formatted = formatRuntimeFieldDisplayValue(raw, column)
  const text = formatted && formatted !== '-' ? formatted : formatAnswer(raw)
  return text === '—' ? '' : text
}

const sameId = (a: unknown, b: string) => {
  const left = String(a || '')
    .trim()
    .toLowerCase()
  return Boolean(left) && left.replace(/-/g, '') === b.replace(/-/g, '')
}

// A table cell stores a thin file reference; the request's attachment list
// carries the ids the viewer needs (same matching as the request page).
const resolveFile = (file: Attachment, attachments: Attachment[]) => {
  const key = String(
    file.itemId || file.fileId || file.id || file.fileName || '',
  )
    .trim()
    .toLowerCase()
  if (!key) return file
  const matched = attachments.find(
    (att) =>
      sameId(att.itemId, key) ||
      sameId(att.id, key) ||
      sameId(att.fileId, key) ||
      String(att.fileName || att.name || '')
        .trim()
        .toLowerCase() === key,
  )
  if (!matched) return file
  return {
    ...file,
    fileName: file.fileName || matched.fileName || matched.name,
    fileSize: matched.fileSize ?? file.fileSize,
    id: file.id ?? matched.id,
    itemId: matched.itemId || file.itemId || matched.id,
    repositoryId: matched.repositoryId || file.repositoryId,
  }
}

const PortalTableField = ({
  attachments = [],
  field,
  label,
  value,
  onOpenAttachment,
}: PortalTableFieldProps) => {
  const { t } = useLingui()
  const rows = useMemo(() => parseRows(value), [value])
  const rowCount = rows.length

  const columns = useMemo<TableColumnDef[]>(() => {
    const specific = settingsOf(field).specific || {}
    const configured: TableColumnDef[] = Array.isArray(specific.tableColumns)
      ? specific.tableColumns
      : []
    const visible = configured.filter(
      (column) =>
        column?.id && settingsOf(column).general?.visibility !== 'HIDDEN',
    )
    if (visible.length) return visible
    // Dynamic tables may not carry column config — fall back to row keys.
    const keys = new Set<string>()
    rows.forEach((row) =>
      Object.keys(row).forEach((key) => {
        if (!key.startsWith('_')) keys.add(key)
      }),
    )
    return [...keys].map((key) => ({ id: key, name: key }))
  }, [field, rows])

  // Phones always get the list view, as on the request page; wider screens
  // can switch between the two.
  const isPhone = useMediaQuery('(max-width: 767px)') ?? false
  const [listView, setListView] = useState(false)
  const showList = isPhone || listView
  const hasData = rows.length > 0 && columns.length > 0

  const renderCell = (row: Record<string, unknown>, column: TableColumnDef) => {
    const raw = cellValue(row, column)
    if (isFileColumnType(column.type)) {
      const files = toFileList(raw).map((file) =>
        resolveFile(file, attachments),
      )
      if (!files.length) return <span className='text-gray-8'>—</span>
      return (
        <span className='flex min-w-0 flex-col items-start gap-1'>
          {files.map((file, index) => {
            const name = String(file.fileName || file.name || t`File`)
            return (
              <button
                className='inline-flex max-w-full min-w-0 cursor-pointer items-center gap-1 rounded text-left font-medium text-primary-11 transition-colors hover:text-primary-9 hover:underline active:text-primary-12'
                key={`${name}-${index}`}
                title={name}
                type='button'
                onClick={() => onOpenAttachment?.(file)}
              >
                <Icon
                  className='size-3 shrink-0 text-gray-8'
                  name='lucide:paperclip'
                />
                <span className='truncate'>{name}</span>
              </button>
            )
          })}
        </span>
      )
    }
    const text = cellText(raw, column)
    if (!text) return <span className='text-gray-8'>—</span>
    return text
  }

  // Up to three filled values as the row's title, as on the request page.
  const rowSummary = (row: Record<string, unknown>) =>
    columns
      .filter((column) => !isFileColumnType(column.type))
      .map((column) => cellText(cellValue(row, column), column))
      .filter(Boolean)
      .slice(0, 3)
      .join(' · ')

  return (
    // Same label style as the plain fields around it, so the table reads as
    // one more field in the list rather than a separate widget
    <div className='animate-in fade-in slide-in-from-bottom-1 min-w-0 pt-4 duration-300 sm:col-span-2 lg:col-span-3'>
      <div className='mb-2 flex items-center gap-1.5'>
        <Icon
          className='size-3.5 shrink-0 text-gray-10'
          name='lucide:table-2'
        />
        <span className='min-w-0 flex-1 truncate text-12 font-medium text-gray-10'>
          {label}
        </span>
        <span className='shrink-0 rounded-full bg-gray-2 px-2 py-0.5 text-11 font-medium text-gray-11'>
          {rowCount === 1 ? t`1 row` : t`${rowCount} rows`}
        </span>
        {!isPhone && hasData && (
          <IconButton
            color='gray'
            icon={listView ? 'lucide:table-2' : 'eva:menu-2-outline'}
            size='xs'
            variant='ghost'
            ariaLabel={
              listView ? t`Switch to table view` : t`Switch to list view`
            }
            tooltip={
              listView ? t`Switch to table view` : t`Switch to list view`
            }
            onClick={() => setListView((prev) => !prev)}
          />
        )}
      </div>

      {!hasData ? (
        <div className='flex items-center justify-center gap-2 rounded-xl border border-dashed border-gray-4 px-4 py-6 text-13 text-gray-9'>
          <Icon className='size-4' name='lucide:inbox' />
          {t`No rows added`}
        </div>
      ) : showList ? (
        // Long tables scroll inside the field instead of stretching the page
        <div className='animate-in fade-in max-h-[32rem] space-y-2 overflow-y-auto overscroll-contain pr-1 duration-200 max-md:max-h-[26rem]'>
          {rows.map((row, rowIndex) => {
            const rowNumber = rowIndex + 1
            const summary = rowSummary(row)
            return (
              <div
                className='animate-in fade-in overflow-hidden rounded-xl border border-gray-3 bg-surface transition-colors duration-200 hover:border-gray-5'
                key={String(row._rowId || rowIndex)}
              >
                <div className='flex items-center gap-2.5 bg-gray-1 px-3.5 py-2.5'>
                  <span className='flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-2 text-11 font-bold text-primary-11'>
                    {rowNumber}
                  </span>
                  <span
                    className={cn(
                      'min-w-0 flex-1 truncate text-13 font-semibold',
                      summary ? 'text-gray-13' : 'text-gray-9',
                    )}
                  >
                    {summary || `${label} ${rowNumber}`}
                  </span>
                </div>
                <div className='grid grid-cols-1 gap-x-8 gap-y-3 border-t border-gray-3 px-3.5 py-3 sm:grid-cols-2 xl:grid-cols-3'>
                  {columns.map((column) => (
                    <div className='min-w-0' key={column.id}>
                      <div className='mb-0.5 text-12 font-medium text-gray-10'>
                        {columnLabel(column)}
                      </div>
                      <div
                        className={cn(
                          'text-14 font-semibold break-words text-gray-13',
                          isNumericColumn(column) && 'tabular-nums',
                        )}
                      >
                        {renderCell(row, column)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className='animate-in fade-in relative w-full max-w-full min-w-0 overflow-hidden rounded-xl border border-[var(--gray-3)] bg-surface duration-200'>
          <div className='max-h-[28rem] w-full overflow-auto overscroll-contain'>
            <table className='w-max min-w-full border-collapse text-13'>
              <thead className='sticky top-0 z-10 bg-[var(--gray-1)] shadow-[0_1px_0_var(--gray-3)]'>
                <tr className='border-b border-gray-3'>
                  <th className='w-10 px-2.5 py-2 text-center text-11 font-bold text-gray-10'>
                    #
                  </th>
                  {columns.map((column) => (
                    <th
                      key={column.id}
                      className={cn(
                        'px-3 py-2 text-left text-11 font-bold whitespace-nowrap text-gray-12',
                        isNumericColumn(column) && 'text-right',
                      )}
                    >
                      {columnLabel(column)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr
                    className='border-b border-gray-3 transition-colors duration-150 last:border-b-0 hover:bg-gray-1'
                    key={String(row._rowId || rowIndex)}
                  >
                    <td className='px-2.5 py-2 text-center text-12 text-gray-9 tabular-nums'>
                      {rowIndex + 1}
                    </td>
                    {columns.map((column) => (
                      <td
                        key={column.id}
                        className={cn(
                          'max-w-xs px-3 py-2 align-top font-medium text-gray-13',
                          isNumericColumn(column)
                            ? 'text-right whitespace-nowrap tabular-nums'
                            : 'break-words',
                        )}
                      >
                        {renderCell(row, column)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

PortalTableField.displayName = 'PortalTableField'
export default PortalTableField
