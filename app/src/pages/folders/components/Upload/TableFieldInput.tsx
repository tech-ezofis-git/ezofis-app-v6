import { useLingui } from '@lingui/react/macro'
import { useEffect, useMemo, useRef, useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import Modal from '@/components/base/Modal'
import cn from '@/utils/cn'

interface TableFieldInputProps {
  label: string
  value: any
  className?: string
  disabled?: boolean
  field?: any
  required?: boolean
  onChange: (jsonString: string) => void
}

const safeParseRows = (
  rawVal: any,
): { columns: string[]; rows: Record<string, any>[] } => {
  let parsed = rawVal
  if (typeof parsed === 'string') {
    const trimmed = parsed.trim()
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        parsed = JSON.parse(trimmed)
      } catch {
        parsed = null
      }
    } else {
      parsed = null
    }
  }

  let rowsArray: any[] = []
  if (Array.isArray(parsed)) {
    rowsArray = parsed
  } else if (parsed && typeof parsed === 'object') {
    if (Array.isArray(parsed.data)) {
      rowsArray = parsed.data
    } else if (Array.isArray(parsed.rows)) {
      rowsArray = parsed.rows
    } else if (Array.isArray(parsed.items)) {
      rowsArray = parsed.items
    }
  }

  // Sanitize rows so each is an object
  const validRows = rowsArray.map((r, idx) => {
    if (r && typeof r === 'object' && !Array.isArray(r)) {
      return { ...r, _id: r._id || r.id || `row_${idx}_${Date.now()}` }
    }
    return { _id: `row_${idx}_${Date.now()}`, value: String(r ?? '') }
  })

  // Extract columns
  const colSet = new Set<string>()
  validRows.forEach((row) => {
    Object.keys(row).forEach((k) => {
      if (k !== '_id' && k !== 'id') colSet.add(k)
    })
  })

  return {
    columns: Array.from(colSet),
    rows: validRows,
  }
}

export default function TableFieldInput({
  className,
  disabled = false,
  field,
  label,
  required = false,
  value,
  onChange,
}: TableFieldInputProps) {
  const { t } = useLingui()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newColName, setNewColName] = useState('')
  const [showAddColInput, setShowAddColInput] = useState(false)
  const [editingCol, setEditingCol] = useState<string | null>(null)
  const [editingColName, setEditingColName] = useState('')
  const colInputRef = useRef<HTMLInputElement>(null)

  // Parse initial rows and columns
  const { initialCols, initialRows } = useMemo(() => {
    const parsed = safeParseRows(value)
    let cols = parsed.columns

    // If field schema specifies columns/options, prefer them
    if (
      field?.options &&
      Array.isArray(field.options) &&
      field.options.length > 0
    ) {
      cols = field.options.map((o: any) => String(o.name || o.value || o))
    } else if (
      field?.columns &&
      Array.isArray(field.columns) &&
      field.columns.length > 0
    ) {
      cols = field.columns.map((c: any) => String(c.name || c.key || c))
    }

    return { initialCols: cols, initialRows: parsed.rows }
  }, [value, field])

  const [columns, setColumns] = useState<string[]>(initialCols)
  const [rows, setRows] = useState<Record<string, any>[]>(initialRows)

  // Sync internal state when external value changes meaningfully
  useEffect(() => {
    const parsed = safeParseRows(value)
    if (
      parsed.rows.length !== rows.length ||
      parsed.columns.some((c) => !columns.includes(c))
    ) {
      if (parsed.rows.length > 0) {
        setRows(parsed.rows)
      }
      if (parsed.columns.length > 0) {
        setColumns((prev) => Array.from(new Set([...prev, ...parsed.columns])))
      }
    }
  }, [value])

  const notifyChange = (nextRows: Record<string, any>[]) => {
    setRows(nextRows)
    // Strip temporary _id from storage
    const cleanRows = nextRows.map(({ _id, ...rest }) => rest)
    if (cleanRows.length === 0) {
      onChange(JSON.stringify({ data: [] }))
    } else {
      onChange(JSON.stringify({ data: cleanRows }))
    }
  }

  const handleAddRow = () => {
    if (disabled || columns.length === 0) return
    const newRow: Record<string, any> = { _id: `row_${Date.now()}` }
    columns.forEach((col) => {
      newRow[col] = ''
    })
    notifyChange([...rows, newRow])
  }

  const handleCellChange = (
    rowIndex: number,
    columnKey: string,
    cellValue: string,
  ) => {
    if (disabled) return
    const updated = [...rows]
    updated[rowIndex] = {
      ...updated[rowIndex],
      [columnKey]: cellValue,
    }
    notifyChange(updated)
  }

  const handleDeleteRow = (rowIndex: number) => {
    if (disabled) return
    const updated = rows.filter((_, idx) => idx !== rowIndex)
    notifyChange(updated)
  }

  const handleAddColumn = () => {
    const trimmed = newColName.trim()
    if (!trimmed || columns.includes(trimmed)) return
    const nextCols = [...columns, trimmed]
    setColumns(nextCols)
    setNewColName('')
    setShowAddColInput(true)
    setTimeout(() => {
      colInputRef.current?.focus()
    }, 0)

    if (rows.length === 0) {
      const newRow: Record<string, any> = {
        _id: `row_${Date.now()}`,
        [trimmed]: '',
      }
      notifyChange([newRow])
    } else {
      const nextRows = rows.map((r) => ({ ...r, [trimmed]: r[trimmed] ?? '' }))
      notifyChange(nextRows)
    }
  }

  const handleDeleteColumn = (colNameToRemove: string) => {
    const nextCols = columns.filter((c) => c !== colNameToRemove)
    setColumns(nextCols)
    if (nextCols.length === 0) {
      notifyChange([])
    } else {
      const nextRows = rows.map((row) => {
        const copy = { ...row }
        delete copy[colNameToRemove]
        return copy
      })
      notifyChange(nextRows)
    }
  }

  const handleStartRename = (col: string) => {
    if (disabled) return
    setEditingCol(col)
    setEditingColName(col)
  }

  const handleSaveRename = (oldColName: string) => {
    const trimmed = editingColName.trim()
    setEditingCol(null)
    if (!trimmed || trimmed === oldColName) return

    if (
      columns.some(
        (c) => c !== oldColName && c.toLowerCase() === trimmed.toLowerCase(),
      )
    ) {
      return
    }

    const nextCols = columns.map((c) => (c === oldColName ? trimmed : c))
    setColumns(nextCols)

    const nextRows = rows.map((row) => {
      const copy = { ...row }
      if (oldColName in copy) {
        copy[trimmed] = copy[oldColName]
        delete copy[oldColName]
      } else {
        copy[trimmed] = copy[trimmed] ?? ''
      }
      return copy
    })
    notifyChange(nextRows)
  }

  const renderTableContent = (inModal = false) => (
    <div className='flex flex-col gap-2'>
      {/* Table Action Bar */}
      <div className='flex flex-wrap items-center justify-between gap-2 border-b border-gray-3 pb-2.5'>
        <div className='flex items-center gap-2'>
          <button
            disabled={disabled || columns.length === 0}
            type='button'
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-2xs transition-all',
              disabled || columns.length === 0
                ? 'cursor-not-allowed border-gray-4 bg-gray-2 text-gray-8 opacity-50'
                : 'cursor-pointer border-primary-5 bg-primary-1 text-primary-10 hover:bg-primary-2 active:scale-95',
            )}
            onClick={handleAddRow}
          >
            <Icon className='size-3.5' name='lucide:plus' />
            <span>{t`Add Row`}</span>
          </button>

          {!showAddColInput ? (
            <button
              className='inline-flex cursor-pointer items-center gap-1 rounded-lg border border-gray-4 bg-surface px-2.5 py-1.5 text-xs font-medium text-gray-11 shadow-2xs transition-all hover:bg-gray-3 hover:text-gray-13 active:scale-95 disabled:opacity-50'
              disabled={disabled}
              type='button'
              onClick={() => setShowAddColInput(true)}
            >
              <Icon className='size-3.5' name='lucide:columns-3' />
              <span>{t`Add Column`}</span>
            </button>
          ) : (
            <div className='flex items-center gap-1'>
              <input
                className='h-7 w-36 rounded-md border border-primary-6 bg-surface px-2 text-xs text-gray-12 outline-none focus:ring-1 focus:ring-primary-6'
                placeholder={t`Column name`}
                ref={colInputRef}
                type='text'
                value={newColName}
                autoFocus
                onChange={(e) => setNewColName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddColumn()
                  } else if (e.key === 'Escape') {
                    setShowAddColInput(false)
                  }
                }}
              />
              <button
                className='cursor-pointer rounded-md bg-primary-9 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-primary-10 disabled:opacity-50'
                disabled={!newColName.trim()}
                type='button'
                onClick={handleAddColumn}
              >
                {t`Add`}
              </button>
              <button
                className='cursor-pointer rounded-md p-1 text-gray-9 hover:text-gray-12'
                type='button'
                onClick={() => setShowAddColInput(false)}
              >
                <Icon className='size-3.5' name='lucide:x' />
              </button>
            </div>
          )}
        </div>

        {!inModal ? (
          <button
            className='inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-10 transition-colors hover:bg-gray-3 hover:text-gray-13'
            title={t`Open full table editor`}
            type='button'
            onClick={() => setIsModalOpen(true)}
          >
            <Icon className='size-3.5' name='lucide:maximize-2' />
            <span>{t`Fullscreen`}</span>
          </button>
        ) : null}
      </div>

      {/* Table Grid */}
      {columns.length === 0 ? (
        <div className='flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-4 bg-gray-1/50 py-8 text-center'>
          <Icon className='mb-2 size-8 text-gray-8' name='lucide:columns-3' />
          <p className='mb-3 text-xs text-gray-10'>
            {t`No columns defined yet. Add a column to begin.`}
          </p>
          <button
            className='inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-4 bg-surface px-3 py-1.5 text-xs font-semibold text-gray-12 shadow-2xs transition-all hover:bg-gray-3 hover:text-gray-13 active:scale-95 disabled:opacity-50'
            disabled={disabled}
            type='button'
            onClick={() => {
              setShowAddColInput(true)
              setTimeout(() => colInputRef.current?.focus(), 0)
            }}
          >
            <Icon className='size-3.5' name='lucide:columns-3' />
            <span>{t`Add Column`}</span>
          </button>
        </div>
      ) : rows.length === 0 ? (
        <div className='flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-4 bg-gray-1/50 py-8 text-center'>
          <Icon className='mb-2 size-8 text-gray-8' name='lucide:table-2' />
          <p className='mb-3 text-xs text-gray-10'>{t`No table rows added yet.`}</p>
          <button
            className='inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-primary-5 bg-surface px-3 py-1.5 text-xs font-semibold text-primary-9 shadow-2xs transition-all hover:bg-primary-1 active:scale-95 disabled:opacity-50'
            disabled={disabled}
            type='button'
            onClick={handleAddRow}
          >
            <Icon className='size-3.5' name='lucide:plus' />
            <span>{t`Add First Row`}</span>
          </button>
        </div>
      ) : (
        <div className='overflow-hidden rounded-lg border border-gray-3 bg-surface shadow-2xs'>
          <div
            className={cn(
              'ez-scrollbar overflow-x-auto',
              inModal ? 'max-h-[60vh]' : 'max-h-72',
            )}
          >
            <table className='w-full border-collapse text-left text-xs'>
              <thead className='sticky top-0 z-10 border-b border-gray-3 bg-gray-2 text-gray-11'>
                <tr>
                  <th className='w-10 px-2 py-2 text-center text-[10px] font-semibold text-gray-9 select-none'>
                    #
                  </th>
                  {columns.map((col) => (
                    <th
                      className='group relative min-w-[130px] px-2.5 py-1.5 text-xs font-semibold text-gray-12'
                      key={col}
                    >
                      {editingCol === col ? (
                        <div className='flex items-center gap-1'>
                          <input
                            className='h-6 w-full rounded border border-primary-6 bg-surface px-1.5 text-xs font-semibold text-gray-12 outline-none focus:ring-1 focus:ring-primary-6'
                            type='text'
                            value={editingColName}
                            autoFocus
                            onBlur={() => handleSaveRename(col)}
                            onChange={(e) => setEditingColName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                handleSaveRename(col)
                              } else if (e.key === 'Escape') {
                                setEditingCol(null)
                              }
                            }}
                          />
                        </div>
                      ) : (
                        <div className='flex items-center justify-between gap-1'>
                          <span
                            className={cn(
                              'truncate select-none',
                              !disabled &&
                                'cursor-pointer transition-colors hover:text-primary-10',
                            )}
                            title={
                              disabled
                                ? undefined
                                : t`Click to edit column name`
                            }
                            onClick={() => !disabled && handleStartRename(col)}
                          >
                            {col}
                          </span>

                          <div className='flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100'>
                            {!disabled ? (
                              <button
                                className='cursor-pointer rounded p-0.5 text-gray-8 transition-all hover:bg-gray-3 hover:text-primary-10'
                                title={t`Edit column "${col}"`}
                                type='button'
                                onClick={() => handleStartRename(col)}
                              >
                                <Icon className='size-3' name='lucide:pencil' />
                              </button>
                            ) : null}

                            {columns.length > 0 && !disabled ? (
                              <button
                                className='cursor-pointer rounded p-0.5 text-gray-8 transition-all hover:bg-red-1 hover:text-red-9'
                                title={t`Delete column "${col}"`}
                                type='button'
                                onClick={() => handleDeleteColumn(col)}
                              >
                                <Icon
                                  className='size-3'
                                  name='lucide:trash-2'
                                />
                              </button>
                            ) : null}
                          </div>
                        </div>
                      )}
                    </th>
                  ))}
                  <th className='w-12 px-2 py-2 text-right' />
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-3 bg-surface'>
                {rows.map((row, rowIdx) => (
                  <tr
                    className='group transition-colors hover:bg-gray-1/80'
                    key={row._id || rowIdx}
                  >
                    <td className='px-2 py-1 text-center font-mono text-[10px] text-gray-9 select-none'>
                      {rowIdx + 1}
                    </td>
                    {columns.map((col) => (
                      <td className='px-2 py-1' key={col}>
                        <input
                          className='w-full rounded border border-transparent bg-transparent px-2 py-1 text-xs text-gray-12 transition-colors placeholder:text-gray-8 hover:border-gray-4 focus:border-primary-6 focus:bg-surface focus:outline-none'
                          disabled={disabled}
                          placeholder={t`Enter value`}
                          type='text'
                          value={row[col] ?? ''}
                          onChange={(e) =>
                            handleCellChange(rowIdx, col, e.target.value)
                          }
                        />
                      </td>
                    ))}
                    <td className='px-2 py-1 text-right'>
                      {!disabled ? (
                        <button
                          className='cursor-pointer rounded-md p-1 text-gray-8 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-1 hover:text-red-9'
                          title={t`Delete row`}
                          type='button'
                          onClick={() => handleDeleteRow(rowIdx)}
                        >
                          <Icon className='size-3.5' name='lucide:trash-2' />
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className={cn('flex w-full flex-col gap-1.5', className)}>
      {/* Field Label Header */}
      <div className='flex items-center justify-between'>
        <label className='text-xs font-semibold tracking-wide text-gray-12'>
          {label}
          {required ? <span className='ml-1 text-red-9'>*</span> : null}
        </label>
        <span className='inline-flex items-center gap-1 rounded-full bg-gray-3 px-2 py-0.5 text-[10px] font-medium text-gray-11'>
          <Icon className='size-3 text-primary-9' name='lucide:table-2' />
          <span>
            {rows.length} {rows.length === 1 ? t`row` : t`rows`}
          </span>
        </span>
      </div>

      {/* Inline Table Component */}
      <div className='rounded-xl border border-gray-3 bg-surface p-3 shadow-2xs'>
        {renderTableContent(false)}
      </div>

      {/* Fullscreen Table Modal */}
      {isModalOpen ? (
        <Modal
          opened={isModalOpen}
          width={960}
          onClose={() => setIsModalOpen(false)}
        >
          <div className='flex max-h-[88vh] min-h-[400px] flex-col overflow-hidden rounded-xl bg-surface'>
            <div className='flex items-center justify-between border-b border-gray-3 px-6 py-4'>
              <div className='flex items-center gap-3'>
                <div className='flex size-9 items-center justify-center rounded-lg bg-primary-1 text-primary-9'>
                  <Icon className='size-5' name='lucide:table-2' />
                </div>
                <div>
                  <h3 className='text-base leading-tight font-semibold text-gray-13'>
                    {label}
                  </h3>
                  <p className='text-xs text-gray-10'>
                    {rows.length}{' '}
                    {rows.length === 1 ? t`row entered` : t`rows entered`} •{' '}
                    {t`stored as JSON data`}
                  </p>
                </div>
              </div>

              <button
                aria-label={t`Close`}
                className='cursor-pointer rounded-lg p-1.5 text-gray-10 transition-colors hover:bg-gray-3 hover:text-gray-13'
                type='button'
                onClick={() => setIsModalOpen(false)}
              >
                <Icon className='size-5' name='lucide:x' />
              </button>
            </div>

            <div className='flex-1 overflow-auto p-6'>
              {renderTableContent(true)}
            </div>

            <div className='flex items-center justify-between border-t border-gray-3 bg-gray-1 px-6 py-3'>
              <span className='text-xs text-gray-10'>
                {rows.length} {rows.length === 1 ? t`total row` : t`total rows`}
              </span>
              <button
                className='cursor-pointer rounded-lg bg-primary-9 px-4 py-1.5 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-primary-10'
                type='button'
                onClick={() => setIsModalOpen(false)}
              >
                {t`Done`}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  )
}
