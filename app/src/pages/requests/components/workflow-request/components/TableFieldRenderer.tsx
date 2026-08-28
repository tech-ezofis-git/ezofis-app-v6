import { useLingui } from '@lingui/react/macro'
import type { ReactNode } from 'react'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import InputDate from '@/components/base/inputs/InputDate'
import InputDateTime from '@/components/base/inputs/InputDateTime'
import InputNumber from '@/components/base/inputs/InputNumber'
import InputText from '@/components/base/inputs/InputText'
import InputTextarea from '@/components/base/inputs/InputTextarea'
import InputTime from '@/components/base/inputs/InputTime'
import Table from '@/components/base/table/Table'
import Tbody from '@/components/base/table/Tbody'
import Td from '@/components/base/table/Td'
import Th from '@/components/base/table/Th'
import Thead from '@/components/base/table/Thead'
import Tr from '@/components/base/table/Tr'
import cn from '@/utils/cn'

const generateRowId = () => {
  try {
    return crypto.randomUUID()
  } catch {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    )
  }
}

interface TableColumn {
  id: string
  name: string
  size?: 'SMALL' | 'MEDIUM' | 'LARGE'
  type?: string
}

interface Props {
  field: any
  value?: Array<Record<string, any>>
  onChange: (rows: Record<string, any>[]) => void
  readOnly?: boolean
  required?: boolean
}

const getColumnWidthClass = (size?: string) => {
  switch (size) {
    case 'SMALL':
      return 'w-28 min-w-[120px]'
    case 'LARGE':
      return 'w-64 min-w-[240px]'
    case 'MEDIUM':
    default:
      return 'w-44 min-w-[160px]'
  }
}

const renderCellInput = (
  col: TableColumn,
  val: any,
  onCellChange: (newVal: any) => void,
  readOnly?: boolean,
): ReactNode => {
  const cellType = (col.type || 'SHORT_TEXT').toUpperCase()

  if (readOnly) {
    return (
      <div className='truncate px-2 py-1 text-xs text-gray-12'>
        {val !== undefined && val !== null && val !== '' ? String(val) : '-'}
      </div>
    )
  }

  switch (cellType) {
    case 'LONG_TEXT':
      return (
        <InputTextarea
          autosize
          maxRows={4}
          minRows={1}
          placeholder={col.name || '...'}
          value={val != null ? String(val) : ''}
          onChange={(v) => onCellChange(v)}
          className='w-full'
        />
      )

    case 'NUMBER':
    case 'COUNTER':
      return (
        <InputNumber
          placeholder='0'
          value={val != null ? val : ''}
          onChange={(v) => onCellChange(v)}
          className='w-full'
        />
      )

    case 'CURRENCY_AMOUNT':
      return (
        <InputNumber
          placeholder='0.00'
          prefix='$'
          thousandSeparator=','
          value={val != null ? val : ''}
          onChange={(v) => onCellChange(v)}
          className='w-full'
        />
      )

    case 'DATE':
      return (
        <InputDate
          placeholder='YYYY-MM-DD'
          value={val != null && val !== '' ? String(val) : null}
          onChange={(v) => onCellChange(v || '')}
          className='w-full'
        />
      )

    case 'TIME':
      return (
        <InputTime
          value={val != null ? String(val) : ''}
          onChange={(v) => onCellChange(v || '')}
          className='w-full'
        />
      )

    case 'DATE_TIME':
      return (
        <InputDateTime
          value={val != null && val !== '' ? String(val) : null}
          onChange={(v) => onCellChange(v || '')}
          className='w-full'
        />
      )

    case 'LABEL':
      return (
        <div className='truncate px-2 py-1 text-xs font-semibold text-gray-11'>
          {val || col.name}
        </div>
      )

    case 'SHORT_TEXT':
    case 'EMAIL':
    case 'PHONE_NUMBER':
    case 'URL':
    default:
      return (
        <InputText
          placeholder={col.name || '...'}
          value={val != null ? String(val) : ''}
          onChange={(v) => onCellChange(v)}
          className='w-full'
        />
      )
  }
}

const TableFieldRenderer = ({
  field,
  onChange,
  readOnly,
  required,
  value,
}: Props) => {
  const { t } = useLingui()
  const general = field?.settings?.general || {}
  const specific = field?.settings?.specific || {}
  const tableColumns: TableColumn[] = specific.tableColumns || []
  const rowsType: 'ON_DEMAND' | 'FIXED' = specific.rowsType || 'ON_DEMAND'
  const fixedRowCount: number = specific.fixedRowCount || 5

  const rows: Array<Record<string, any>> = (() => {
    const raw = Array.isArray(value) ? value : []
    if (rowsType === 'FIXED') {
      if (raw.length >= fixedRowCount) {
        return raw.slice(0, fixedRowCount)
      }
      const backfilled = [...raw]
      while (backfilled.length < fixedRowCount) {
        backfilled.push({ _rowId: generateRowId() })
      }
      return backfilled
    }
    // ON_DEMAND: by default open at least 1 row
    if (raw.length === 0) {
      return [{ _rowId: generateRowId() }]
    }
    return raw
  })()

  const handleCellChange = (rowIndex: number, colId: string, cellVal: any) => {
    const next = rows.map((r, i) => {
      if (i !== rowIndex) return r
      return {
        ...r,
        [colId]: cellVal,
      }
    })
    onChange(next)
  }

  const handleAddRow = () => {
    onChange([...rows, { _rowId: generateRowId() }])
  }

  const handleDeleteRow = (rowIndex: number) => {
    const next = rows.filter((_, i) => i !== rowIndex)
    onChange(next.length > 0 ? next : [{ _rowId: generateRowId() }])
  }

  if (tableColumns.length === 0) {
    return (
      <div className='rounded-lg border border-dashed border-gray-3 bg-gray-1 p-4 text-center text-12 text-gray-9 italic'>
        {t`No table columns configured.`}
      </div>
    )
  }

  return (
    <div className='w-full min-w-0 max-w-full space-y-2'>
      <div className='flex items-center justify-between gap-2'>
        <div>
          <label className='block text-13 font-medium text-gray-12'>
            {field.label}
            {required && <span className='ml-1 text-red-9'>*</span>}
          </label>
          {general.description && (
            <p className='mt-0.5 text-12 text-gray-9'>{general.description}</p>
          )}
        </div>
        {!readOnly && rowsType === 'ON_DEMAND' && (
          <button
            type='button'
            className='flex cursor-pointer items-center gap-1.5 rounded-lg border border-primary-5/40 bg-primary-1/50 px-2.5 py-1 text-xs font-bold text-primary-9 shadow-2xs transition-colors hover:bg-primary-1 active:scale-95'
            onClick={handleAddRow}
          >
            <Icon height={13} name='lucide:plus' width={13} />
            <span>{t`Add Row`}</span>
          </button>
        )}
      </div>

      <div className='min-w-0 w-full max-w-full overflow-x-auto overscroll-x-contain rounded-lg border border-gray-3 bg-white shadow-2xs'>
        <Table className='w-max min-w-full border-collapse'>
          <Thead className='bg-gray-2/60'>
            <Tr className='border-b border-gray-3'>
              <Th className='w-10 px-2.5 py-2 text-center text-11 font-bold text-gray-10'>
                #
              </Th>
              {tableColumns.map((col) => (
                <Th
                  key={col.id}
                  className={cn(
                    'px-3 py-2 text-left text-11 font-bold text-gray-12',
                    getColumnWidthClass(col.size),
                  )}
                >
                  <span className='truncate'>{col.name || 'Column'}</span>
                </Th>
              ))}
              {!readOnly && rowsType === 'ON_DEMAND' && (
                <Th className='w-10 px-2 py-2 text-center text-11 font-bold text-gray-10'>
                  <span className='sr-only'>{t`Actions`}</span>
                </Th>
              )}
            </Tr>
          </Thead>
          <Tbody>
            {rows.map((row, rowIndex) => (
              <Tr
                key={row._rowId || `row-${rowIndex}`}
                className='border-b border-gray-2 last:border-0 hover:bg-gray-1/40 transition-colors'
              >
                <Td className='px-2.5 py-1.5 text-center text-xs font-semibold text-gray-8'>
                  {rowIndex + 1}
                </Td>
                {tableColumns.map((col) => (
                  <Td key={col.id} className='p-1.5 align-middle'>
                    {renderCellInput(
                      col,
                      row[col.id],
                      (cellVal) => handleCellChange(rowIndex, col.id, cellVal),
                      readOnly,
                    )}
                  </Td>
                ))}
                {!readOnly && rowsType === 'ON_DEMAND' && (
                  <Td className='px-1.5 py-1 text-center align-middle'>
                    <IconButton
                      color='red'
                      icon='lucide:trash-2'
                      size='xs'
                      variant='ghost'
                      aria-label={t`Delete row`}
                      onClick={() => handleDeleteRow(rowIndex)}
                    />
                  </Td>
                )}
              </Tr>
            ))}
          </Tbody>
        </Table>
      </div>
    </div>
  )
}

TableFieldRenderer.displayName = 'TableFieldRenderer'
export default TableFieldRenderer
