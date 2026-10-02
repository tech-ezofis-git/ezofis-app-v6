import { Icon } from '@iconify/react'
import { useLingui } from '@lingui/react/macro'
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import Tooltip from '@/components/base/Tooltip'
import {
  ApiCatalogSelect,
  mapExternalRowsToTableColumns,
} from '@/pages/requests/components/workflow-request/components/TableFieldRenderer'
import cn from '@/utils/cn'

const cellInputClass =
  'w-full rounded-md border border-transparent bg-transparent px-0 py-0.5 text-left text-inherit outline-none transition-colors hover:border-gray-4 hover:bg-gray-1 focus:border-[var(--primary-6)] focus:bg-surface'

const wrappingTextClass =
  'block min-w-0 break-words whitespace-pre-wrap'

const AutoGrowTextarea = ({
  className,
  value,
  onChange,
}: {
  className?: string
  value: string
  onChange: (value: string) => void
}) => {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      className={cn(
        cellInputClass,
        wrappingTextClass,
        'block min-h-[1.5rem] w-full resize-none overflow-hidden',
        className,
      )}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}

const META_ROW_KEYS = new Set(['_rowId', '_approved', '_hideNote'])

const generateRowId = () => {
  try {
    return crypto.randomUUID()
  } catch {
    return `row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }
}

const normalizeKey = (value: string) =>
  value.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ')

export const columnLabel = (col: AgentFlatTableColumn) =>
  String(col.name || col.id || '')

const isApiColumn = (col: AgentFlatTableColumn) =>
  col?.settings?.lookupSettings?.optionsSource === 'API'

const parseColumnOptions = (col: AgentFlatTableColumn) =>
  String(col?.settings?.specific?.customOptions || '')
    .split(',')
    .map((opt) => opt.trim())
    .filter(Boolean)
    .map((opt) => ({ id: opt, name: opt }))

const columnType = (col: AgentFlatTableColumn) =>
  String(col.type || 'SHORT_TEXT').toUpperCase()

const isNumericColumn = (col: AgentFlatTableColumn) => {
  const type = columnType(col)
  return type === 'NUMBER' || type === 'COUNTER' || type === 'CURRENCY_AMOUNT'
}

/** Form columns first; append any extra row keys not covered by the form schema. */
export const resolveAgentTableColumns = (
  formColumns: AgentFlatTableColumn[],
  rows: Record<string, any>[],
): AgentFlatTableColumn[] => {
  const base = [...formColumns]
  if (!rows.length) return base

  const knownIds = new Set(base.map((col) => col.id))
  const knownNames = new Set(base.map((col) => normalizeKey(columnLabel(col))))

  const extras: AgentFlatTableColumn[] = []
  rows.forEach((row) => {
    Object.keys(row || {}).forEach((key) => {
      if (META_ROW_KEYS.has(key) || key.startsWith('_') || knownIds.has(key)) {
        return
      }
      if (
        base.length > 0 &&
        /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(key)
      ) {
        return
      }
      const normalized = normalizeKey(key)
      if (knownNames.has(normalized)) return
      knownIds.add(key)
      knownNames.add(normalized)
      extras.push({ id: key, name: key, type: 'SHORT_TEXT' })
    })
  })

  return [...base, ...extras]
}

export interface AgentFlatTableColumn {
  id: string
  name?: string
  type?: string
  settings?: any
}

interface Props {
  columns: AgentFlatTableColumn[]
  rows: Record<string, any>[]
  title: string
  allowAddRow?: boolean
  icon?: string
  iconClassName?: string
  readOnly?: boolean
  showRowApprove?: boolean
  onChange: (rows: Record<string, any>[]) => void
  onMoveRow?: (row: Record<string, any>) => void
  onRemoveRow?: (row: Record<string, any>) => void
  allowDelete?: boolean
}

const AgentFlatTable = ({
  allowAddRow = true,
  allowDelete = true,
  columns: columnsProp,
  icon = 'tabler:table',
  iconClassName = 'text-[var(--primary-9)]',
  readOnly = false,
  rows: rowsProp,
  showRowApprove = false,
  title,
  onChange,
  onMoveRow,
  onRemoveRow,
}: Props) => {
  const { t } = useLingui()
  const [rows, setRows] = useState<Record<string, any>[]>(() => rowsProp || [])

  useEffect(() => {
    setRows(rowsProp || [])
  }, [rowsProp])

  const columns = useMemo(
    () => resolveAgentTableColumns(columnsProp, rows),
    [columnsProp, rows],
  )

  const emptyRow = useMemo(() => {
    const row: Record<string, any> = { _rowId: generateRowId() }
    columns.forEach((col) => {
      row[col.id] = ''
    })
    return row
  }, [columns])

  const persist = (next: Record<string, any>[]) => {
    setRows(next)
    onChange(next)
  }

  const updateCell = (index: number, key: string, value: any) => {
    persist(
      rows.map((row, i) => (i === index ? { ...row, [key]: value } : row)),
    )
  }

  const addRow = () => {
    persist([...rows, { ...emptyRow, _rowId: generateRowId() }])
  }

  const deleteRow = (index: number) => {
    const row = rows[index]
    const next = rows.filter((_, i) => i !== index)
    persist(next.length > 0 ? next : [{ ...emptyRow, _rowId: generateRowId() }])
    if (!row || !onRemoveRow) return
    const hasValue = Object.entries(row).some(
      ([key, value]) =>
        !key.startsWith('_') && String(value ?? '').trim() !== '',
    )
    if (hasValue) onRemoveRow(row)
  }

  const moveRow = (index: number) => {
    const row = rows[index]
    if (!row || !onMoveRow) return
    const next = rows.filter((_, i) => i !== index)
    persist(next)
    onMoveRow(row)
  }

  const approveRow = (index: number) => {
    persist(
      rows.map((row, i) =>
        i === index ? { ...row, _approved: true, _hideNote: true } : row,
      ),
    )
  }

  const canEdit = !readOnly
  const actionCount =
    (onMoveRow ? 1 : 0) + (showRowApprove ? 1 : 0) + (allowDelete ? 1 : 0)
  const singleAction = actionCount <= 1

  if (!columns.length) return null

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex items-center justify-between gap-2'>
        <h4 className='flex items-center gap-1.5 text-sm font-semibold text-gray-12'>
          <Icon className={cn('h-4 w-4', iconClassName)} icon={icon} />
          {title} ({rows.length})
        </h4>
        {canEdit && allowAddRow && (
          <button
            className='inline-flex cursor-pointer items-center gap-1 rounded-md border border-[var(--primary-4)] bg-[var(--primary-1)] px-2 py-1 text-[11px] font-bold text-[var(--primary-11)] transition-colors hover:bg-[var(--primary-2)] active:scale-95'
            type='button'
            onClick={addRow}
          >
            <Icon className='h-3.5 w-3.5' icon='tabler:plus' />
            {t`Add Row`}
          </button>
        )}
      </div>
      <div className='w-full overflow-x-auto rounded-lg border border-gray-3'>
        <table className='w-full table-fixed border-collapse text-left text-sm'>
          <thead className='bg-gray-1 text-xs text-gray-11'>
            <tr>
              {columns.map((col, index) => (
                <th
                  key={col.id}
                  className={cn(
                    'border border-gray-3 px-3 py-2 text-left font-semibold',
                    index === 0 && 'w-auto',
                    index > 0 &&
                      !isNumericColumn(col) &&
                      'w-[12.5rem] whitespace-nowrap',
                    isNumericColumn(col) ? 'text-right' : 'text-left',
                  )}
                >
                  {columnLabel(col)}
                </th>
              ))}
              {canEdit && actionCount > 0 && (
                <th
                  aria-label={t`Actions`}
                  className={cn(
                    'border border-gray-3 py-2 whitespace-nowrap',
                    singleAction ? 'w-10 px-1' : 'w-16 px-1.5',
                  )}
                />
              )}
            </tr>
          </thead>
          <tbody className='bg-surface'>
            {rows.map((row, index) => (
              <tr className='group' key={row._rowId || index}>
                {columns.map((col, colIdx) => (
                  <td
                    key={col.id}
                    className={cn(
                      'border border-gray-3 px-3 py-2 text-left align-top text-gray-11',
                      colIdx === 0 && 'w-auto',
                      colIdx > 0 &&
                        !isNumericColumn(col) &&
                        'w-[12.5rem] whitespace-nowrap',
                      isNumericColumn(col)
                        ? 'text-right font-medium text-gray-12'
                        : 'text-left',
                    )}
                  >
                    {renderCell(
                      col,
                      row[col.id],
                      canEdit,
                      (value) => updateCell(index, col.id, value),
                      colIdx > 0 && !isNumericColumn(col),
                    )}
                  </td>
                ))}
                {canEdit && actionCount > 0 && (
                  <td
                    className={cn(
                      'border border-gray-3 py-1 text-center align-middle whitespace-nowrap',
                      singleAction ? 'w-10 px-1' : 'w-16 px-1.5',
                    )}
                  >
                    <div className='inline-flex items-center justify-center gap-0.5'>
                      {onMoveRow ? (
                        <Tooltip content={t`Move to matched items`}>
                          <button
                            aria-label={t`Move to matched items`}
                            className='inline-flex size-7 cursor-pointer items-center justify-center rounded-md p-1 text-[var(--primary-11)] transition-all hover:bg-[var(--primary-2)] active:scale-95'
                            type='button'
                            onClick={() => moveRow(index)}
                          >
                            <Icon className='h-4 w-4' icon='tabler:arrow-right' />
                          </button>
                        </Tooltip>
                      ) : null}
                      {showRowApprove ? (
                        row._approved ? (
                          <Tooltip content={t`Approved`}>
                            <span
                              aria-label={t`Approved`}
                              className='inline-flex size-7 items-center justify-center rounded-md border border-green-6 bg-green-3 text-green-11'
                            >
                              <Icon className='h-3.5 w-3.5' icon='tabler:check' />
                            </span>
                          </Tooltip>
                        ) : (
                          <Tooltip content={t`Approve`}>
                            <button
                              aria-label={t`Approve`}
                              className='inline-flex size-7 cursor-pointer items-center justify-center rounded-md border border-gray-5 bg-gray-2 text-gray-9 transition-all hover:border-gray-6 hover:bg-gray-3 hover:text-gray-11 active:scale-95'
                              type='button'
                              onClick={() => approveRow(index)}
                            >
                              <Icon className='h-3.5 w-3.5' icon='tabler:check' />
                            </button>
                          </Tooltip>
                        )
                      ) : null}
                      {allowDelete ? (
                        <Tooltip content={t`Delete row`}>
                          <button
                            aria-label={t`Delete row`}
                            className='inline-flex size-7 cursor-pointer items-center justify-center rounded-md p-1 text-red-9 opacity-60 transition-all group-hover:opacity-100 hover:bg-red-2 active:scale-95'
                            type='button'
                            onClick={() => deleteRow(index)}
                          >
                            <Icon className='h-4 w-4' icon='tabler:trash' />
                          </button>
                        </Tooltip>
                      ) : null}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function renderCell(
  col: AgentFlatTableColumn,
  value: any,
  canEdit: boolean,
  onChange: (value: any) => void,
  singleLine = false,
): ReactNode {
  const type = columnType(col)
  const label = columnLabel(col)

  const withLabel = (control: ReactNode) => {
    if (!label) return control
    return (
      <Tooltip
        className='flex w-full min-w-0 items-start'
        content={label}
        openDelay={200}
        position='top'
      >
        {control}
      </Tooltip>
    )
  }

  if (!canEdit) {
    return withLabel(
      <span
        className={cn(
          wrappingTextClass,
          'text-left leading-snug',
          singleLine && 'whitespace-nowrap',
          isNumericColumn(col) ? 'text-right font-medium' : 'text-left',
        )}
      >
        {value != null && value !== '' ? String(value) : 'NA'}
      </span>,
    )
  }

  if (
    (type === 'SINGLE_SELECT' || type === 'SINGLE_CHOICE') &&
    isApiColumn(col)
  ) {
    return withLabel(
      <div className='max-w-[220px] min-w-0'>
        <ApiCatalogSelect
          col={{ ...col, name: col.name || col.id } as any}
          compact
          value={value}
          onSelectProduct={(code) => onChange(code)}
        />
      </div>,
    )
  }

  if (type === 'LONG_TEXT') {
    return withLabel(
      <AutoGrowTextarea value={value ?? ''} onChange={onChange} />,
    )
  }

  if (isNumericColumn(col)) {
    return withLabel(
      <input
        type='number'
        value={value ?? ''}
        className={cn(cellInputClass, 'text-right')}
        onChange={(event) => onChange(event.target.value)}
      />,
    )
  }

  if (type === 'SINGLE_SELECT' || type === 'SINGLE_CHOICE') {
    const options = parseColumnOptions(col)
    return withLabel(
      <select
        className={cellInputClass}
        value={value != null ? String(value) : ''}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value='' />
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.name}
          </option>
        ))}
      </select>,
    )
  }

  return withLabel(
    <AutoGrowTextarea
      className={singleLine ? 'whitespace-nowrap' : undefined}
      value={value ?? ''}
      onChange={onChange}
    />,
  )
}

export const normalizeAgentTableRows = (
  externalRows: Record<string, any>[],
  columns: AgentFlatTableColumn[],
) => {
  if (!externalRows?.length) return []
  const resolvedColumns = resolveAgentTableColumns(columns, externalRows)
  const mapped = mapExternalRowsToTableColumns(externalRows, resolvedColumns)
  return mapped.map((row) =>
    row._rowId ? row : { ...row, _rowId: generateRowId() },
  )
}

export default AgentFlatTable
