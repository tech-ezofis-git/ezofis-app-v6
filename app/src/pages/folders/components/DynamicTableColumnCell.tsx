import { useMemo, useState } from 'react'
import { useLingui } from '@lingui/react/macro'
import Icon from '@/components/base/icon/Icon'
import Modal from '@/components/base/Modal'
import cn from '@/utils/cn'

export const isTableColumnType = (dataType?: string): boolean => {
  if (!dataType) return false
  const t = String(dataType).trim().toUpperCase()
  return t === 'DYNAMIC_TABLE' || t === 'TABLE' || t.includes('TABLE')
}

/**
 * Parses raw column value.
 * Validates that the data is in JSON format and contains array/table data (e.g. { data: [...] } or [...]).
 * If not in valid JSON format, returns null (treated as empty value).
 */
export const parseTableData = (rawVal: any): any[] | null => {
  if (rawVal === undefined || rawVal === null || rawVal === '' || rawVal === '-') {
    return null
  }

  let parsed = rawVal

  if (typeof parsed === 'string') {
    const trimmed = parsed.trim()
    // Must look like JSON
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      return null
    }
    try {
      parsed = JSON.parse(trimmed)
    } catch {
      return null
    }
  }

  if (Array.isArray(parsed)) {
    return parsed
  }

  if (parsed && typeof parsed === 'object') {
    if (Array.isArray(parsed.data)) {
      return parsed.data
    }
    if (Array.isArray(parsed.rows)) {
      return parsed.rows
    }
    if (Array.isArray(parsed.items)) {
      return parsed.items
    }
  }

  return null
}

const formatCellString = (val: any): string => {
  if (val === null || val === undefined || val === '') return '-'
  if (typeof val === 'object') {
    try {
      return JSON.stringify(val)
    } catch {
      return String(val)
    }
  }
  return String(val)
}

const formatHeaderLabel = (key: string): string => {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (str) => str.toUpperCase())
}

interface DynamicTableColumnCellProps {
  rawVal: any
  title?: string
  className?: string
}

export default function DynamicTableColumnCell({
  rawVal,
  title,
  className,
}: DynamicTableColumnCellProps) {
  const { t } = useLingui()
  const [opened, setOpened] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const rows = useMemo(() => parseTableData(rawVal), [rawVal])

  // Extract column keys from rows
  const tableColumns = useMemo(() => {
    if (!rows || !rows.length) return []
    const first = rows[0]
    if (typeof first !== 'object' || first === null || Array.isArray(first)) {
      return [{ key: 'value', label: t`Value` }]
    }

    const keySet = new Set<string>()
    rows.forEach((r) => {
      if (r && typeof r === 'object' && !Array.isArray(r)) {
        Object.keys(r).forEach((k) => keySet.add(k))
      }
    })

    return Array.from(keySet).map((key) => ({
      key,
      label: formatHeaderLabel(key),
    }))
  }, [rows, t])

  const filteredRows = useMemo(() => {
    if (!rows) return []
    if (!searchTerm.trim()) return rows
    const term = searchTerm.toLowerCase().trim()
    return rows.filter((row) => {
      if (typeof row !== 'object' || row === null) {
        return String(row).toLowerCase().includes(term)
      }
      return Object.values(row).some((val) =>
        String(val ?? '').toLowerCase().includes(term),
      )
    })
  }, [rows, searchTerm])

  if (!rows) {
    const stringVal =
      rawVal === undefined || rawVal === null || rawVal === ''
        ? '-'
        : typeof rawVal === 'object'
          ? JSON.stringify(rawVal)
          : String(rawVal).trim() || '-'

    return (
      <span
        className={cn(
          'block max-w-full truncate text-xs leading-4 font-normal text-gray-10',
          className,
        )}
        title={stringVal !== '-' ? stringVal : undefined}
      >
        {stringVal}
      </span>
    )
  }

  const rowCount = rows.length

  const displayTitle = title || t`Table Data`

  return (
    <>
      <button
        type='button'
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border border-gray-4 bg-surface px-2.5 py-0.5 text-xs font-medium text-gray-12 shadow-2xs hover:border-primary-7 hover:bg-primary-1/30 hover:text-primary-10 transition-all active:scale-95 cursor-pointer',
          className,
        )}
        onClick={(e) => {
          e.stopPropagation()
          setOpened(true)
        }}
        title={t`Click to view table data (${rowCount} ${rowCount === 1 ? 'row' : 'rows'})`}
      >
        <Icon name='lucide:table-2' className='size-3.5 text-primary-9 shrink-0' />
        <span className='font-semibold text-gray-13'>{rowCount}</span>
        <span className='text-[10px] text-gray-10'>{rowCount === 1 ? t`row` : t`rows`}</span>
      </button>

      {opened ? (
        <Modal opened={opened} width={920} onClose={() => setOpened(false)}>
          <div className='flex flex-col max-h-[85vh] min-h-[300px] overflow-hidden bg-surface rounded-xl'>
            {/* Modal Header */}
            <div className='flex items-center justify-between border-b border-gray-3 px-6 py-4'>
              <div className='flex items-center gap-3'>
                <div className='flex size-9 items-center justify-center rounded-lg bg-primary-1 text-primary-9'>
                  <Icon name='lucide:table-2' className='size-5' />
                </div>
                <div>
                  <h3 className='text-base font-semibold text-gray-13 leading-tight'>
                    {displayTitle}
                  </h3>
                  <p className='text-xs text-gray-10'>
                    {rowCount} {rowCount === 1 ? t`total record` : t`total records`}
                  </p>
                </div>
              </div>

              <div className='flex items-center gap-3'>
                {rowCount > 4 ? (
                  <div className='relative w-56'>
                    <Icon
                      name='lucide:search'
                      className='absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-9 pointer-events-none'
                    />
                    <input
                      type='text'
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder={t`Search rows...`}
                      className='w-full rounded-lg border border-gray-4 bg-surface py-1.5 pl-8 pr-3 text-xs text-gray-12 placeholder:text-gray-9 focus:border-primary-9 focus:outline-none'
                    />
                  </div>
                ) : null}

                <button
                  type='button'
                  onClick={() => setOpened(false)}
                  className='rounded-lg p-1.5 text-gray-10 hover:bg-gray-3 hover:text-gray-13 transition-colors cursor-pointer'
                  aria-label={t`Close`}
                >
                  <Icon name='lucide:x' className='size-5' />
                </button>
              </div>
            </div>

            {/* Modal Table Body */}
            <div className='flex-1 overflow-auto p-6'>
              {filteredRows.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-12 text-center text-gray-10'>
                  <Icon name='lucide:search-x' className='size-8 text-gray-8 mb-2' />
                  <p className='text-sm'>{t`No matching rows found.`}</p>
                </div>
              ) : (
                <div className='overflow-hidden rounded-lg border border-gray-3 shadow-2xs'>
                  <div className='max-h-[55vh] overflow-auto ez-scrollbar'>
                    <table className='w-full border-collapse text-left text-xs'>
                      <thead className='sticky top-0 z-10 bg-gray-2 text-gray-11 font-medium border-b border-gray-3'>
                        <tr>
                          <th className='w-12 px-3 py-2.5 text-center text-[11px] text-gray-9 font-semibold'>
                            #
                          </th>
                          {tableColumns.map((col) => (
                            <th
                              key={col.key}
                              className='px-4 py-2.5 font-semibold text-gray-12 whitespace-nowrap'
                            >
                              {col.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className='divide-y divide-gray-3 bg-surface'>
                        {filteredRows.map((row, idx) => (
                          <tr
                            key={idx}
                            className='hover:bg-gray-2/70 transition-colors'
                          >
                            <td className='px-3 py-2 text-center text-[11px] text-gray-9 font-mono select-none'>
                              {idx + 1}
                            </td>
                            {tableColumns.map((col) => {
                              const cellVal =
                                typeof row === 'object' && row !== null
                                  ? row[col.key]
                                  : row
                              return (
                                <td
                                  key={col.key}
                                  className='px-4 py-2 text-gray-12 max-w-xs truncate'
                                  title={formatCellString(cellVal)}
                                >
                                  {formatCellString(cellVal)}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className='flex items-center justify-between border-t border-gray-3 bg-gray-1 px-6 py-3'>
              <span className='text-xs text-gray-10'>
                {t`Showing`} {filteredRows.length} {t`of`} {rowCount} {t`rows`}
              </span>
              <button
                type='button'
                onClick={() => setOpened(false)}
                className='rounded-lg bg-surface px-4 py-1.5 text-xs font-medium text-gray-12 border border-gray-4 hover:bg-gray-3 transition-colors cursor-pointer shadow-2xs'
              >
                {t`Close`}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </>
  )
}
