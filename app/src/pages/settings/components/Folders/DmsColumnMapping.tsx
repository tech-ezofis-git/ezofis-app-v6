import { useEffect, useMemo, useRef, useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import Tooltip from '@/components/base/Tooltip'
import cn from '@/utils/cn'

const DATA_TYPES = [
  { icon: 'lucide:type', id: 'SHORT_TEXT', name: 'Short Text' },
  { icon: 'tabler:align-left', id: 'LONG_TEXT', name: 'Long Text' },
  { icon: 'tabler:numbers', id: 'NUMBER', name: 'Number' },
  { icon: 'tabler:toggle-left', id: 'BOOLEAN', name: 'Boolean' },
  { icon: 'tabler:calendar', id: 'DATE', name: 'Date' },
  { icon: 'tabler:clock', id: 'TIME', name: 'Time' },
  { icon: 'tabler:calendar-time', id: 'DATE_TIME', name: 'Date & Time' },
  { icon: 'tabler:list', id: 'SINGLE_SELECT', name: 'Dropdown' },
  { icon: 'tabler:table', id: 'TABLE', name: 'Table' },
  { icon: 'tabler:barcode', id: 'BARCODE', name: 'Barcode' },
  { icon: 'tabler:checkbox', id: 'OMR', name: 'Checkbox/OMR' },
  { icon: 'tabler:calculator', id: 'CALCULATED', name: 'Calculated' },
  { icon: 'tabler:settings', id: 'AUTO_GENERATED', name: 'Auto Generated' },
  { icon: 'tabler:link', id: 'LINK', name: 'Link' },
]

type FieldRow = {
  dataType: string
  fieldName: string
  iconKey?: string
  id: string
  includeInFolderStructure: boolean
  isMandatory: boolean
  level: number
  orderId: number
  system?: boolean
}

interface DmsColumnMappingProps {
  fields: FieldRow[]
  mapping: Record<string, string>
  dataTypes: Record<string, string>
  previewRows: any[]
  uploadedColumns: string[]
  syncFields?: string[]
  onUpdateMapping: (mapping: Record<string, string>) => void
  onUpdateDataTypes: (dataTypes: Record<string, string>) => void
  onUpdateSyncFields?: (syncFields: string[]) => void
}

const MENU_LABEL_CLASS = 'mb-0.5 flex h-8 w-full items-center gap-1.5 rounded-md px-2 text-13 font-semibold text-gray-12 transition-colors'
const OPTION_ITEM_CLASS = 'group flex h-8 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-left text-13 font-normal transition-colors focus-visible:outline-0'
const OPTION_ITEM_IDLE_CLASS = 'text-gray-12 hover:bg-gray-2 hover:text-gray-13 focus-visible:bg-gray-2'
const OPTION_ITEM_SELECTED_CLASS = 'bg-primary-2 text-primary-9'
const OPTION_LABEL_CLASS = 'truncate transition-colors'

function CompactRadioIndicator({ checked }: { checked?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex size-3.5 shrink-0 items-center justify-center rounded-full border transition-colors',
        checked ? 'border-primary-9 bg-primary-9' : 'border-gray-5 bg-transparent',
      )}
    >
      {checked ? <span className='size-1 rounded-full bg-white' /> : null}
    </span>
  )
}

export default function DmsColumnMapping({
  fields = [],
  mapping = {},
  dataTypes = {},
  syncFields = [],
  previewRows = [],
  uploadedColumns = [],
  onUpdateMapping,
  onUpdateDataTypes,
  onUpdateSyncFields,
}: DmsColumnMappingProps) {
  const [activeDropdownRow, setActiveDropdownRow] = useState<string | null>(null)
  const [activeTypeDropdownRow, setActiveTypeDropdownRow] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const typeDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdownRow(null)
      }
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target as Node)) {
        setActiveTypeDropdownRow(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelectExcelColumn = (repoFieldName: string, excelCol: string | null) => {
    const nextMapping = { ...mapping }
    if (excelCol) {
      nextMapping[repoFieldName] = excelCol
    } else {
      delete nextMapping[repoFieldName]
    }
    onUpdateMapping(nextMapping)
    setActiveDropdownRow(null)
    setSearchQuery('')
  }

  const handleSelectDataType = (repoFieldName: string, typeVal: string) => {
    onUpdateDataTypes({
      ...dataTypes,
      [repoFieldName]: typeVal
    })
    setActiveTypeDropdownRow(null)
  }

  const handleToggleSyncField = (repoFieldName: string, checked: boolean) => {
    if (!onUpdateSyncFields) return
    if (checked) {
      onUpdateSyncFields([...(syncFields || []), repoFieldName])
    } else {
      onUpdateSyncFields((syncFields || []).filter(f => f !== repoFieldName))
    }
  }

  return (
    <div className='flex flex-col rounded-xl border border-border-default bg-surface shadow-2xs'>
      {/* Header */}
      <div className='flex items-center gap-3 border-b border-border-default bg-gray-1/50 px-5 py-3'>
        <div className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-2 text-primary-9'>
          <Icon className='size-4' name='tabler:columns' />
        </div>
        <div>
          <h3 className='text-[13px] font-semibold text-gray-12'>
            Map Repository Fields (destination) to Excel Fields (source).
          </h3>
        </div>
      </div>

      {/* Table header */}
      <div className='grid grid-cols-12 gap-4 border-b border-border-default/50 bg-gray-1/30 px-5 py-2.5 text-xs font-semibold text-gray-11'>
        <div className='col-span-4 flex items-center gap-2'>
          <Icon className='size-3.5 text-primary-9' name='tabler:database' />
          Folder Fields
        </div>
        <div className='col-span-8 flex items-center gap-3 pl-2'>
          <div className='flex-1 flex items-center gap-2'>
            <Icon className='size-3.5 text-green-11' name='lucide:file-spreadsheet' />
            Excel Fields
          </div>
          <div className='flex w-16 shrink-0 items-center justify-end pr-2 text-primary-9'>
            Sync
          </div>
        </div>
      </div>

      {/* Rows */}
      <div className='flex max-h-[400px] flex-col overflow-y-auto overflow-x-hidden'>
        {fields.map((field, index) => {
          const repoFieldName = field.fieldName
          const mappedExcelCol = mapping[repoFieldName]
          const isMapped = !!mappedExcelCol
          const selectedDataType = dataTypes[repoFieldName] || field.dataType || 'SHORT_TEXT'
          const activeDataTypeObj = DATA_TYPES.find(d => d.id === selectedDataType) || DATA_TYPES[0]
          
          const isDropdownOpen = activeDropdownRow === repoFieldName
          const isTypeDropdownOpen = activeTypeDropdownRow === repoFieldName

          const filteredExcelCols = uploadedColumns.filter((col) => 
            col.toLowerCase().includes(searchQuery.toLowerCase())
          )

          return (
            <div
              className={cn(
                'grid grid-cols-12 items-center gap-4 border-b border-border-default/50 px-5 py-3 transition-colors',
                isMapped ? 'bg-transparent' : 'bg-gray-1/30',
              )}
              key={repoFieldName}
            >
              {/* Repository Field Name */}
              <div className='col-span-4 flex min-w-0 items-center gap-2'>
                <div
                  className={cn(
                    'truncate text-[13px] font-medium transition-colors',
                    isMapped ? 'text-gray-12' : 'text-gray-11',
                  )}
                  title={repoFieldName}
                >
                  {repoFieldName}
                </div>
              </div>

              {/* Combined Excel Column & Datatype Picker */}
              <div className='col-span-8 flex items-center relative gap-3'>
                <div className='flex-1 relative'>
                  <div
                  className={cn(
                    'flex h-[36px] w-full cursor-pointer items-center justify-between rounded-lg border bg-surface px-3 font-normal transition-all duration-200 select-none',
                    isDropdownOpen ? 'border-primary-9 ring-2 ring-primary-9/20' : 'border-gray-3 hover:border-gray-4'
                  )}
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveTypeDropdownRow(null)
                    setActiveDropdownRow(isDropdownOpen ? null : repoFieldName)
                    setSearchQuery('')
                  }}
                >
                  <div className='flex min-w-0 items-center gap-2'>
                    {isMapped ? (
                      <>
                        <Tooltip content='Excel Column' position='top'>
                          <span className='inline-flex shrink-0' onClick={(e) => e.stopPropagation()}>
                            <Icon name='lucide:file-spreadsheet' className='size-3.5 text-green-11' />
                          </span>
                        </Tooltip>
                        <span className='truncate text-[13px] font-normal'>{mappedExcelCol}</span>
                      </>
                    ) : (
                      <span className='truncate text-[13px] font-normal text-gray-9'>
                        Skip this field (unmapped)
                      </span>
                    )}
                  </div>

                  <div className='flex shrink-0 items-center gap-1.5'>
                    {/* Datatype picker icon inside the field on the right side */}
                    {isMapped && (
                      <Tooltip content={activeDataTypeObj.name} position='top'>
                        <button
                          type='button'
                          className={cn(
                            'flex size-6 items-center justify-center rounded-md border transition-colors hover:bg-gray-2',
                            isTypeDropdownOpen ? 'border-gray-4 bg-gray-2' : 'border-transparent',
                          )}
                          onClick={(e) => {
                            e.stopPropagation()
                            setActiveDropdownRow(null)
                            setActiveTypeDropdownRow(isTypeDropdownOpen ? null : repoFieldName)
                          }}
                        >
                          <Icon className='size-3.5 shrink-0 text-gray-10' name={activeDataTypeObj.icon} />
                        </button>
                      </Tooltip>
                    )}
                    <Icon
                      name='tabler:chevron-down'
                      className={cn(
                        'size-3.5 shrink-0 text-gray-10 transition-transform duration-200',
                        isDropdownOpen && 'rotate-180',
                      )}
                    />
                  </div>
                </div>

                {/* Datatype Dropdown Selection */}
                {isTypeDropdownOpen && isMapped && (
                  <div
                    className='absolute top-[calc(100%+4px)] right-0 z-50 w-[220px] rounded-lg border border-gray-3 bg-surface-raised p-1 pt-2 shadow-md animate-in fade-in zoom-in-95'
                    ref={typeDropdownRef}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className={cn(MENU_LABEL_CLASS, 'mb-1 text-gray-11')}>
                      Choose datatype
                    </div>
                    <div className='custom-scrollbar max-h-56 overflow-y-auto'>
                      {DATA_TYPES.map((type) => {
                        const isSelected = selectedDataType === type.id
                        return (
                          <button
                            key={type.id}
                            type='button'
                            className={cn(
                              OPTION_ITEM_CLASS,
                              isSelected ? OPTION_ITEM_SELECTED_CLASS : OPTION_ITEM_IDLE_CLASS,
                            )}
                            onClick={() => handleSelectDataType(repoFieldName, type.id)}
                          >
                            <CompactRadioIndicator checked={isSelected} />
                            <Icon
                              className={cn(
                                'size-3.5 shrink-0 transition-colors',
                                isSelected ? 'text-primary-9' : 'text-gray-10 group-hover:text-gray-11',
                              )}
                              name={type.icon}
                            />
                            <span className={OPTION_LABEL_CLASS}>{type.name}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Excel Column Dropdown Selection */}
                {isDropdownOpen && (
                  <div
                    className='absolute top-[calc(100%+4px)] right-0 left-0 z-40 flex max-h-[300px] flex-col overflow-hidden rounded-xl border border-border-default bg-surface shadow-lg animate-in fade-in zoom-in-95'
                    ref={dropdownRef}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className='border-b border-border-default p-2'>
                      <div className='flex items-center gap-2 rounded-md bg-gray-2 px-2.5 py-1.5 focus-within:ring-1 focus-within:ring-primary-9'>
                        <Icon className='size-3.5 text-gray-10' name='lucide:search' />
                        <input
                          // eslint-disable-next-line jsx-a11y/no-autofocus
                          autoFocus
                          className='w-full bg-transparent text-13 text-gray-12 placeholder-gray-9 outline-none'
                          placeholder='Search excel headers...'
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className='flex-1 overflow-y-auto p-1.5 custom-scrollbar'>
                      <div className={MENU_LABEL_CLASS}>
                        <Icon className='size-3.5 text-gray-10' name='lucide:file-spreadsheet' />
                        Excel Headers
                      </div>
                      {filteredExcelCols.length > 0 ? (
                        filteredExcelCols.map((colName) => (
                          <button
                            className={cn(
                              OPTION_ITEM_CLASS,
                              mappedExcelCol === colName ? OPTION_ITEM_SELECTED_CLASS : OPTION_ITEM_IDLE_CLASS,
                            )}
                            key={colName}
                            type='button'
                            onClick={() => handleSelectExcelColumn(repoFieldName, colName)}
                          >
                            <CompactRadioIndicator checked={mappedExcelCol === colName} />
                            <span className={OPTION_LABEL_CLASS}>{colName}</span>
                          </button>
                        ))
                      ) : (
                        <div className='px-2 py-3 text-center text-12 text-gray-10'>
                          No columns found
                        </div>
                      )}
                    </div>

                    {/* Clear mapping option */}
                    {mappedExcelCol && (
                      <div className='border-t border-border-default p-1.5'>
                        <button
                          className={cn(OPTION_ITEM_CLASS, 'text-red-9 hover:bg-red-2 hover:text-red-10')}
                          type='button'
                          onClick={() => handleSelectExcelColumn(repoFieldName, null)}
                        >
                          <Icon className='size-3.5' name='lucide:x' />
                          <span className={OPTION_LABEL_CLASS}>Clear mapping</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
                </div>
                
                {/* Sync Checkbox */}
                <div className='flex shrink-0 items-center w-16 justify-end pr-2'>
                  <label 
                    className={cn(
                      'flex items-center transition-opacity', 
                      isMapped ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed opacity-40'
                    )} 
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!isMapped) e.preventDefault()
                    }}
                  >
                    <div className={cn(
                      'flex size-[18px] items-center justify-center rounded border transition-colors',
                      syncFields?.includes(repoFieldName) && isMapped ? 'border-primary-9 bg-primary-9' : 'border-gray-4 bg-surface',
                      isMapped && 'hover:border-primary-9'
                    )}>
                      {syncFields?.includes(repoFieldName) && isMapped && <Icon name='lucide:check' className='size-3.5 text-white' />}
                    </div>
                    <input 
                      type='checkbox' 
                      className='hidden' 
                      disabled={!isMapped}
                      checked={syncFields?.includes(repoFieldName) || false}
                      onChange={(e) => handleToggleSyncField(repoFieldName, e.target.checked)}
                    />
                  </label>
                </div>
              </div>
            </div>
          )
        })}

        {fields.length === 0 && (
          <div className='py-8 text-center text-13 font-medium text-gray-10'>
            No repository fields found.
          </div>
        )}
      </div>
    </div>
  )
}
