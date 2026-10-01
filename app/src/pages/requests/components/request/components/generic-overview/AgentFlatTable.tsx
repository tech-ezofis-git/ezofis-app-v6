import { Icon } from '@iconify/react'
import { useLingui } from '@lingui/react/macro'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import Tooltip from '@/components/base/Tooltip'
import {
  ApiCatalogSelect,
  mapExternalRowsToTableColumns,
} from '@/pages/requests/components/workflow-request/components/TableFieldRenderer'
import cn from '@/utils/cn'

const cellInputClass =
  'w-full rounded-md border border-transparent bg-transparent px-1 py-0.5 text-inherit outline-none transition-colors hover:border-gray-4 hover:bg-gray-1 focus:border-[var(--primary-6)] focus:bg-white'

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
      if (META_ROW_KEYS.has(key) || knownIds.has(key)) return
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
  icon?: string
  readOnly?: boolean
  showRowApprove?: boolean
  onChange: (rows: Record<string, any>[]) => void
}

const AgentFlatTable = ({
  columns: columnsProp,
  icon = 'tabler:table',
  readOnly = false,
  rows: rowsProp,
  showRowApprove = false,
  title,
  onChange,
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
    const next = rows.filter((_, i) => i !== index)
    persist(next.length > 0 ? next : [{ ...emptyRow, _rowId: generateRowId() }])
  }

  const approveRow = (index: number) => {
    persist(
      rows.map((row, i) =>
        i === index ? { ...row, _approved: true, _hideNote: true } : row,
      ),
    )
  }

  const canEdit = !readOnly

  if (!columns.length) return null

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex items-center justify-between gap-2'>
        <h4 className='flex items-center gap-1.5 text-sm font-semibold text-gray-12'>
          <Icon className='h-4 w-4 text-[var(--primary-9)]' icon={icon} />
          {title} ({rows.length})
        </h4>
        {canEdit && (
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
      <div className='overflow-x-auto rounded-lg border border-gray-3'>
        <table className='w-full min-w-max border-collapse text-left text-sm'>
          <thead className='bg-gray-1 text-xs text-gray-11'>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.id}
                  className={cn(
                    'border border-gray-3 p-3 font-semibold whitespace-nowrap',
                    isNumericColumn(col) && 'text-right',
                  )}
                >
                  {columnLabel(col)}
                </th>
              ))}
              {canEdit && (
                <th
                  aria-label={t`Actions`}
                  className='w-px border border-gray-3 p-2 whitespace-nowrap'
                />
              )}
            </tr>
          </thead>
          <tbody className='bg-surface'>
            {rows.map((row, index) => (
              <tr className='group' key={row._rowId || index}>
                {columns.map((col) => (
                  <td
                    key={col.id}
                    className={cn(
                      'min-w-[8rem] border border-gray-3 p-3 align-top text-gray-11',
                      isNumericColumn(col) &&
                        'text-right font-medium text-gray-12',
                      columnType(col) === 'LONG_TEXT' && 'min-w-[12rem]',
                    )}
                  >
                    {renderCell(col, row[col.id], canEdit, (value) =>
                      updateCell(index, col.id, value),
                    )}
                  </td>
                ))}
                {canEdit && (
                  <td className='w-px border border-gray-3 p-2 text-right align-top whitespace-nowrap'>
                    <div className='inline-flex items-center justify-end gap-1'>
                      {showRowApprove ? (
                        row._approved ? (
                          <span
                            aria-label={t`Approved`}
                            className='inline-flex size-7 items-center justify-center rounded-md border border-green-6 bg-green-3 text-green-11'
                            title={t`Approved`}
                          >
                            <Icon className='h-3.5 w-3.5' icon='tabler:check' />
                          </span>
                        ) : (
                          <button
                            aria-label={t`Approve`}
                            className='inline-flex size-7 cursor-pointer items-center justify-center rounded-md border border-gray-5 bg-gray-2 text-gray-9 transition-all hover:border-gray-6 hover:bg-gray-3 hover:text-gray-11 active:scale-95'
                            title={t`Approve`}
                            type='button'
                            onClick={() => approveRow(index)}
                          >
                            <Icon className='h-3.5 w-3.5' icon='tabler:check' />
                          </button>
                        )
                      ) : null}
                      <button
                        aria-label={t`Delete row`}
                        className='inline-flex size-7 cursor-pointer items-center justify-center rounded-md p-1 text-red-9 opacity-60 transition-all group-hover:opacity-100 hover:bg-red-2 active:scale-95'
                        title={t`Delete row`}
                        type='button'
                        onClick={() => deleteRow(index)}
                      >
                        <Icon className='h-4 w-4' icon='tabler:trash' />
                      </button>
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
): ReactNode {
  const type = columnType(col)
  const label = columnLabel(col)

  const withLabel = (control: ReactNode) => {
    if (!label) return control
    return (
      <Tooltip
        className='flex w-full min-w-0'
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
      <span className='block min-w-0 truncate'>
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
          compact
          col={{ ...col, name: col.name || col.id } as any}
          value={value}
          onSelectProduct={(code) => onChange(code)}
        />
      </div>,
    )
  }

  if (type === 'LONG_TEXT') {
    return withLabel(
      <textarea
        className={cn(cellInputClass, 'min-h-[2.5rem] resize-y')}
        rows={2}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
      />,
    )
  }

  if (isNumericColumn(col)) {
    return withLabel(
      <input
        type='number'
        value={value ?? ''}
        className={cn(
          cellInputClass,
          type === 'CURRENCY_AMOUNT' ? 'text-right' : 'text-center',
        )}
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
    <input
      className={cellInputClass}
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value)}
    />,
  )
}

export const normalizeAgentTableRows = (
  externalRows: Record<string, any>[],
  columns: AgentFlatTableColumn[],
) => {
  if (!externalRows.length) return []
  const resolvedColumns = resolveAgentTableColumns(columns, externalRows)
  const mapped = mapExternalRowsToTableColumns(externalRows, resolvedColumns)
  return mapped.map((row) =>
    row._rowId ? row : { ...row, _rowId: generateRowId() },
  )
}

export default AgentFlatTable
