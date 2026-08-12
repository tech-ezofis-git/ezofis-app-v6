import dayjs from 'dayjs'
import { useEffect, useRef, useState } from 'react'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import InputSelect from '@/components/base/inputs/InputSelect'
import showToast from '@/components/base/toast/showToast'
import Tooltip from '@/components/base/Tooltip'
import { AnimateFadeIn } from '@/components/common/animations'
import { findBestHeaderMatch } from '@/pages/requests/components/request/components/newrequest/poFlow/utils/headerSimilarity'
import { SYSTEM_TEMPLATE_COLUMNS } from '@/pages/requests/components/request/components/newrequest/poFlow/utils/templateSchema'
import cn from '@/utils/cn'

export interface TemplateColumn {
  key: string
  required: boolean
}

interface ColumnMappingProps {
  mapping: Record<string, string>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  previewRows: any[]
  uploadedColumns: string[]
  autoScrollAndHighlight?: boolean
  availableGroupIds?: string[]
  confirmButtonText?: string
  groupedPreviewRows?: any[]
  groupingColumn?: string | null
  isConfirmLoading?: boolean
  previewGroupId?: string
  showActionsRow?: boolean
  // Grouping Props
  showGrouping?: boolean

  simple?: boolean
  templateSchema?: readonly TemplateColumn[]
  title?: string
  totalGroupsCount?: number
  totalRowsCount?: number
  onCancel?: () => void
  onChangeMapping: (mapping: Record<string, string>) => void
  onConfirm?: () => void
  onGroupingColumnChange?: (col: string | null) => void
  onPreviewGroupChange?: (id: string) => void
}

export default function ColumnMapping({
  autoScrollAndHighlight = true,
  availableGroupIds = [],
  confirmButtonText,
  groupedPreviewRows = [],
  groupingColumn,
  isConfirmLoading = false,
  mapping,
  previewGroupId,
  previewRows,
  showActionsRow = false,
  showGrouping = false,
  simple = false,
  templateSchema = SYSTEM_TEMPLATE_COLUMNS,
  title,
  totalGroupsCount = 0,
  totalRowsCount = 0,
  uploadedColumns,
  onCancel,
  onChangeMapping,
  onConfirm,
  onGroupingColumnChange,
  onPreviewGroupChange,
}: ColumnMappingProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isHighlightActive, setIsHighlightActive] = useState(false)

  // Automatically run auto-map on mount if mapping is empty
  useEffect(() => {
    if (Object.keys(mapping).length === 0 && uploadedColumns.length > 0) {
      runAutoMap()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-scroll and highlight when this component mounts with columns
  useEffect(() => {
    if (autoScrollAndHighlight && uploadedColumns.length > 0) {
      const scrollTimer = setTimeout(() => {
        containerRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        })
      }, 200)

      setIsHighlightActive(true)
      const highlightTimer = setTimeout(() => {
        setIsHighlightActive(false)
      }, 3000)

      return () => {
        clearTimeout(scrollTimer)
        clearTimeout(highlightTimer)
      }
    }
  }, [autoScrollAndHighlight, uploadedColumns])

  const runAutoMap = () => {
    const nextMapping: Record<string, string> = {}
    templateSchema.forEach((col) => {
      const match = findBestHeaderMatch(col.key, uploadedColumns)
      if (match) {
        nextMapping[col.key] = match
      }
    })
    onChangeMapping(nextMapping)
  }

  const handleReset = () => {
    runAutoMap()
    showToast({
      message: 'Reset to initial mapping suggestions.',
      variant: 'default',
    })
  }

  const handleSelectChange = (systemKey: string, value: string | null) => {
    onChangeMapping({
      ...mapping,
      [systemKey]: value ?? '',
    })
  }

  const requiredColumns = templateSchema.filter((c) => c.required)
  const requiredTotalCount = requiredColumns.length
  const requiredMappedCount = requiredColumns.filter(
    (c) => !!mapping[c.key] && mapping[c.key] !== 'Skip to Import',
  ).length

  const isConfirmDisabled = templateSchema.some(
    (col) => col.required && !mapping[col.key],
  )

  return (
    <div className='w-full' ref={containerRef}>
      <AnimateFadeIn
        className={cn(
          'animate-in fade-in slide-in-from-top-2 transition-all duration-1000',
          simple
            ? 'mt-0 space-y-3 rounded-xl border border-border-default bg-surface-primary px-4 pt-2.5 pb-4 shadow-sm'
            : cn(
                'mt-4 space-y-4 rounded-xl border p-5 shadow-sm',
                isHighlightActive
                  ? 'border-primary-9 bg-primary-1/10 shadow-md ring-4 shadow-primary-9/5 ring-primary-9/20'
                  : 'border-border-default bg-surface-primary',
              ),
        )}
      >
        {!simple && (
          <div className='flex items-center justify-between border-b border-border-default pb-3'>
            <div>
              <h4 className='text-[14px] font-bold text-gray-12'>
                {title || 'Confirm Column Mapping'}
              </h4>
              <p className='mt-0.5 text-[11px] text-gray-8'>
                Align uploaded columns with master system fields.
              </p>
            </div>
            <Tooltip content='Reset to default' position='top'>
              <button
                className='flex items-center gap-1 text-[11px] font-bold text-primary-9 hover:underline'
                type='button'
                onClick={handleReset}
              >
                <Icon className='size-3.5' name='tabler:rotate' />
                {/* <span>Reset</span> */}
              </button>
            </Tooltip>
          </div>
        )}

        {showGrouping && (
          <div className='flex flex-col gap-4 border-b border-border-default pt-1 pb-4'>
            <div className='flex items-center justify-between'>
              <div className='flex flex-col'>
                <span className='text-[12px] font-bold text-gray-12'>
                  Grouping
                </span>
                <span className='text-[11px] text-gray-8'>Group By Column</span>
              </div>
              <div className='w-[200px]'>
                <InputSelect
                  className='w-full'
                  options={uploadedColumns.map((c) => ({ id: c, name: c }))}
                  placeholder='Select group column...'
                  clearable
                  searchable
                  styles={{
                    input: {
                      fontSize: '12px',
                      height: '32px',
                      minHeight: '32px',
                    },
                  }}
                  value={
                    groupingColumn
                      ? { id: groupingColumn, name: groupingColumn }
                      : null
                  }
                  onChange={(v) =>
                    onGroupingColumnChange?.(v ? String(v.id) : null)
                  }
                />
              </div>
            </div>
            <div className='flex gap-4 text-[11px] font-medium text-gray-9'>
              <div className='flex items-center gap-1.5'>
                <Icon className='size-3.5 text-green-11' name='tabler:check' />
                <span>{totalGroupsCount} Purchase Orders Detected</span>
              </div>
              <div className='flex items-center gap-1.5'>
                <Icon className='size-3.5 text-green-11' name='tabler:check' />
                <span>{totalRowsCount} Line Items Detected</span>
              </div>
            </div>
          </div>
        )}

        {/* Three-column Mapping Table */}
        <div className='flex flex-col gap-2'>
          {/* Table Header */}
          <div className='grid grid-cols-[160px_1.2fr_1fr] border-b border-border-default pb-2 text-[11px] font-semibold tracking-wider text-gray-10'>
            <div>System Fields</div>
            <div className='pl-4'>Your Fields</div>
            <div>Preview</div>
          </div>

          {/* Scrollable Mapping Rows Container */}
          <div className='custom-scrollbar max-h-[300px] divide-y divide-border-default/60 overflow-y-auto pr-1'>
            {[...templateSchema]
              .sort((a, b) => {
                if (a.required === b.required) return 0
                return a.required ? -1 : 1
              })
              .map((col) => {
                const selectedVal = mapping[col.key] || ''
                const isMapped = !!selectedVal
                const rawVal =
                  selectedVal && selectedVal !== 'Skip to Import'
                    ? previewRows[0]?.[selectedVal]
                    : ''

                let previewVal = ''
                if (rawVal !== undefined && rawVal !== null && rawVal !== '') {
                  if (col.key.toLowerCase().includes('date')) {
                    if (rawVal instanceof Date) {
                      previewVal = dayjs(rawVal).format('YYYY-MM-DD')
                    } else {
                      const num = Number(rawVal)
                      if (!isNaN(num) && num > 30000 && num < 60000) {
                        const parsedDate = new Date(
                          Math.round((num - 25569) * 86400 * 1000),
                        )
                        previewVal = dayjs(parsedDate).format('YYYY-MM-DD')
                      } else {
                        const parsed = dayjs(rawVal)
                        if (
                          parsed.isValid() &&
                          parsed.format() !== 'Invalid Date' &&
                          isNaN(Number(rawVal))
                        ) {
                          previewVal = parsed.format('YYYY-MM-DD')
                        } else {
                          previewVal = String(rawVal)
                        }
                      }
                    }
                  } else {
                    previewVal = String(rawVal)
                  }
                }

                return (
                  <div
                    className='grid grid-cols-[160px_1.2fr_1fr] items-center gap-4 py-2.5 first:pt-1'
                    key={col.key}
                  >
                    {/* Column 1: System Field */}
                    <div className='flex min-w-0 items-center gap-1.5'>
                      <span className='truncate text-[13px] font-semibold text-gray-12 hover:overflow-visible hover:break-words hover:whitespace-normal'>
                        {col.key}
                      </span>
                      {col.required && (
                        <Icon
                          className='size-2 shrink-0 animate-pulse text-red-11'
                          name='tabler:asterisk'
                          title='Required Field'
                        />
                      )}
                    </div>

                    {/* Column 2: Your Field (Dropdown Selector) */}
                    <div>
                      <InputSelect
                        className='w-full'
                        placeholder='Select column...'
                        clearable
                        searchable
                        options={[
                          { id: 'Skip to Import', name: 'Skip to Import' },
                          ...uploadedColumns.map((c) => ({ id: c, name: c })),
                        ]}
                        styles={{
                          input: {
                            backgroundColor: isMapped
                              ? 'var(--primary-2)'
                              : 'var(--surface-primary)',
                            border: isMapped
                              ? '1px solid var(--primary-9)'
                              : '1px solid var(--gray-4)',
                            borderRadius: '0.5rem',
                            color: isMapped
                              ? 'var(--primary-12)'
                              : 'var(--gray-12)',
                            fontSize: '12px',
                            fontWeight: 500,
                            height: '32px',
                            minHeight: '32px',
                          },
                        }}
                        value={
                          selectedVal
                            ? { id: selectedVal, name: selectedVal }
                            : null
                        }
                        onChange={(v) =>
                          handleSelectChange(col.key, v ? String(v.id) : null)
                        }
                      />
                    </div>

                    {/* Column 3: Preview Value */}
                    <div className='truncate text-[12px] font-medium text-gray-8 hover:overflow-visible hover:break-words hover:whitespace-normal'>
                      {selectedVal === 'Skip to Import' ? (
                        <span className='italic'>Skipped</span>
                      ) : previewVal ? (
                        <span>{previewVal}</span>
                      ) : (
                        <span className='italic'>No data</span>
                      )}
                    </div>
                  </div>
                )
              })}
          </div>
        </div>

        {/* Grouped Preview Section */}
        {showGrouping && previewGroupId && (
          <div className='mt-2 flex flex-col gap-3 rounded-xl border border-border-default bg-surface-secondary/50 p-4'>
            <div className='flex items-center justify-between'>
              <div className='flex flex-col'>
                <span className='text-[12px] font-bold text-gray-12'>
                  Preview Group
                </span>
                <span className='text-[11px] text-gray-8'>
                  Viewing {groupedPreviewRows.length} Line Items
                </span>
              </div>
              <div className='w-[200px]'>
                <InputSelect
                  className='w-full'
                  options={availableGroupIds.map((id) => ({ id, name: id }))}
                  placeholder='Select PO to preview...'
                  searchable
                  styles={{
                    input: {
                      fontSize: '12px',
                      height: '32px',
                      minHeight: '32px',
                    },
                  }}
                  value={
                    previewGroupId
                      ? { id: previewGroupId, name: previewGroupId }
                      : null
                  }
                  onChange={(v) => {
                    if (v && onPreviewGroupChange) {
                      onPreviewGroupChange(String(v.id))
                    }
                  }}
                />
              </div>
            </div>

            {/* Render a simple table for the grouped line items */}
            <div className='custom-scrollbar mt-1 max-h-[200px] overflow-auto rounded-lg border border-border-default bg-surface-primary shadow-2xs'>
              <table className='w-full text-left text-[11px] text-gray-11'>
                <thead className='sticky top-0 bg-surface-muted'>
                  <tr className='border-b border-border-default'>
                    {templateSchema.map((col) => {
                      // Only show mapped columns in the preview table
                      if (
                        !mapping[col.key] ||
                        mapping[col.key] === 'Skip to Import'
                      )
                        return null
                      return (
                        <th
                          className='px-3 py-2 font-bold whitespace-nowrap text-gray-12'
                          key={col.key}
                        >
                          {col.key}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody className='divide-y divide-border-default'>
                  {groupedPreviewRows.map((row, idx) => (
                    <tr className='hover:bg-surface-hover' key={idx}>
                      {templateSchema.map((col) => {
                        const excelHeader = mapping[col.key]
                        if (!excelHeader || excelHeader === 'Skip to Import')
                          return null
                        return (
                          <td
                            className='max-w-[150px] truncate px-3 py-1.5 whitespace-nowrap'
                            key={col.key}
                          >
                            {String(row[excelHeader] ?? '')}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                  {groupedPreviewRows.length === 0 && (
                    <tr>
                      <td
                        className='px-3 py-4 text-center text-gray-8 italic'
                        colSpan={templateSchema.length}
                      >
                        No line items found for this group.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Summary / Actions Footer */}
        {showActionsRow ? (
          <div className='mt-2 flex items-center justify-between border-t border-border-default pt-4'>
            <span className='text-[11px] font-semibold text-gray-8'>
              {requiredMappedCount} of {requiredTotalCount} required fields
              mapped
            </span>
            <div className='flex gap-2.5'>
              <Button size='xs' variant='outline' onClick={onCancel}>
                Cancel
              </Button>
              <Button
                disabled={isConfirmDisabled}
                loading={isConfirmLoading}
                size='xs'
                onClick={onConfirm}
              >
                {confirmButtonText || 'Confirm & Ingest'}
              </Button>
            </div>
          </div>
        ) : (
          <div className='flex items-center justify-between border-t border-border-default pt-4 text-[11px] font-semibold text-gray-8'>
            <span>
              {requiredMappedCount} of {requiredTotalCount} required fields
              mapped
            </span>
            {requiredMappedCount === requiredTotalCount ? (
              <div className='flex items-center gap-1 font-semibold text-green-11'>
                <Icon className='size-3.5' name='tabler:circle-check' />
                <span>Ready to continue</span>
              </div>
            ) : (
              <div className='flex items-center gap-1 font-semibold text-orange-11'>
                <Icon className='size-3.5' name='tabler:alert-circle' />
                <span>Mapping required</span>
              </div>
            )}
          </div>
        )}
      </AnimateFadeIn>
    </div>
  )
}
