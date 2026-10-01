import { useLingui } from '@lingui/react/macro'
import { useMemo, useState } from 'react'
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
  if (
    rawVal === undefined ||
    rawVal === null ||
    rawVal === '' ||
    rawVal === '-'
  ) {
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
  className?: string
  title?: string
}

export default function DynamicTableColumnCell({
  className,
  rawVal,
  title,
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
        String(val ?? '')
          .toLowerCase()
          .includes(term),
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
        title={stringVal !== '-' ? stringVal : undefined}
        className={cn(
          'block max-w-full truncate text-xs leading-4 font-normal text-gray-10',
          className,
        )}
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
        title={t`Click to view table data (${rowCount} ${rowCount === 1 ? 'row' : 'rows'})`}
        type='button'
        className={cn(
          'inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-gray-4 bg-surface px-2.5 py-0.5 text-xs font-medium text-gray-12 shadow-2xs transition-all hover:border-primary-7 hover:bg-primary-1/30 hover:text-primary-10 active:scale-95',
          className,
        )}
        onClick={(e) => {
          e.stopPropagation()
          setOpened(true)
        }}
      >
        <Icon
          className='size-3.5 shrink-0 text-primary-9'
          name='lucide:table-2'
        />
        <span className='font-semibold text-gray-13'>{rowCount}</span>
        <span className='text-[10px] text-gray-10'>
          {rowCount === 1 ? t`row` : t`rows`}
        </span>
      </button>

      {opened ? (
        <Modal opened={opened} width={920} onClose={() => setOpened(false)}>
          <div className='flex max-h-[85vh] min-h-[300px] flex-col overflow-hidden rounded-xl bg-surface'>
            {/* Modal Header */}
            <div className='flex items-center justify-between border-b border-gray-3 px-6 py-4'>
              <div className='flex items-center gap-3'>
                <div className='flex size-9 items-center justify-center rounded-lg bg-primary-1 text-primary-9'>
                  <Icon className='size-5' name='lucide:table-2' />
                </div>
                <div>
                  <h3 className='text-base leading-tight font-semibold text-gray-13'>
                    {displayTitle}
                  </h3>
                  <p className='text-xs text-gray-10'>
                    {rowCount}{' '}
                    {rowCount === 1 ? t`total record` : t`total records`}
                  </p>
                </div>
              </div>

              <div className='flex items-center gap-3'>
                {rowCount > 4 ? (
                  <div className='relative w-56'>
                    <Icon
                      className='pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-gray-9'
                      name='lucide:search'
                    />
                    <input
                      className='w-full rounded-lg border border-gray-4 bg-surface py-1.5 pr-3 pl-8 text-xs text-gray-12 placeholder:text-gray-9 focus:border-primary-9 focus:outline-none'
                      placeholder={t`Search rows...`}
                      type='text'
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                ) : null}

                <button
                  aria-label={t`Close`}
                  className='cursor-pointer rounded-lg p-1.5 text-gray-10 transition-colors hover:bg-gray-3 hover:text-gray-13'
                  type='button'
                  onClick={() => setOpened(false)}
                >
                  <Icon className='size-5' name='lucide:x' />
                </button>
              </div>
            </div>

            {/* Modal Table Body */}
            <div className='flex-1 overflow-auto p-6'>
              {filteredRows.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-12 text-center text-gray-10'>
                  <Icon
                    className='mb-2 size-8 text-gray-8'
                    name='lucide:search-x'
                  />
                  <p className='text-sm'>{t`No matching rows found.`}</p>
                </div>
              ) : (
                <div className='overflow-hidden rounded-lg border border-gray-3 shadow-2xs'>
                  <div className='ez-scrollbar max-h-[55vh] overflow-auto'>
                    <table className='w-full border-collapse text-left text-xs'>
                      <thead className='sticky top-0 z-10 border-b border-gray-3 bg-gray-2 font-medium text-gray-11'>
                        <tr>
                          <th className='w-12 px-3 py-2.5 text-center text-[11px] font-semibold text-gray-9'>
                            #
                          </th>
                          {tableColumns.map((col) => (
                            <th
                              className='px-4 py-2.5 font-semibold whitespace-nowrap text-gray-12'
                              key={col.key}
                            >
                              {col.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className='divide-y divide-gray-3 bg-surface'>
                        {filteredRows.map((row, idx) => (
                          <tr
                            className='transition-colors hover:bg-gray-2/70'
                            key={idx}
                          >
                            <td className='px-3 py-2 text-center font-mono text-[11px] text-gray-9 select-none'>
                              {idx + 1}
                            </td>
                            {tableColumns.map((col) => {
                              const cellVal =
                                typeof row === 'object' && row !== null
                                  ? row[col.key]
                                  : row
                              return (
                                <td
                                  className='max-w-xs truncate px-4 py-2 text-gray-12'
                                  key={col.key}
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
                className='cursor-pointer rounded-lg border border-gray-4 bg-surface px-4 py-1.5 text-xs font-medium text-gray-12 shadow-2xs transition-colors hover:bg-gray-3'
                type='button'
                onClick={() => setOpened(false)}
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
