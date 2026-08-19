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
      {/* Header Row */}
      <div className='sticky top-0 z-10 grid grid-cols-12 items-center gap-4 border-b border-border-default bg-gray-2/50 px-5 py-3 text-[13px] font-semibold text-gray-12 backdrop-blur-sm'>
        <div className='col-span-3 flex items-center gap-2'>
          <Icon className='size-3.5 text-green-11' name='lucide:file-spreadsheet' />
          Excel Fields
        </div>
        <div className='col-span-3 flex items-center gap-2'>
          <Icon className='size-3.5 text-blue-11' name='lucide:layout-template' />
          Example Value
        </div>
        <div className='col-span-6 flex items-center gap-3 pl-2'>
          <div className='flex-1 flex items-center gap-2'>
            <Icon className='size-3.5 text-indigo-11' name='lucide:database' />
            Folder Fields
          </div>
          <div className='flex w-16 shrink-0 items-center justify-end pr-2 text-primary-9'>
            Sync
          </div>
        </div>
      </div>

      {/* Rows */}
      <div className='flex max-h-[400px] flex-col overflow-y-auto overflow-x-hidden'>
        {uploadedColumns.map((excelColName, index) => {
          const mappedRepoFieldName = Object.keys(mapping).find(key => mapping[key] === excelColName) || ''
          const mappedRepoField = fields.find(f => f.fieldName === mappedRepoFieldName)
          const isMapped = !!mappedRepoFieldName
          const repoDataType = mappedRepoField?.dataType || 'SHORT_TEXT'
          const activeDataTypeObj = DATA_TYPES.find(d => d.id === repoDataType) || DATA_TYPES[0]
          
          const isDropdownOpen = activeDropdownRow === excelColName

          const filteredFields = fields.filter((f) => 
            f.fieldName.toLowerCase().includes(searchQuery.toLowerCase())
          )

          return (
            <div
              className={cn(
                'grid grid-cols-12 items-center gap-4 border-b border-border-default/50 px-5 py-3 transition-colors',
                isMapped ? 'bg-transparent' : 'bg-gray-1/30',
              )}
              key={excelColName}
            >
              {/* Excel Field Name */}
              <div className='col-span-3 flex min-w-0 items-center gap-2'>
                <div
                  className='truncate text-[13px] font-medium text-gray-12'
                  title={excelColName}
                >
                  {excelColName}
                </div>
              </div>

              {/* Example Value */}
              <div className='col-span-3 flex min-w-0 items-center gap-2 pr-2'>
                {previewRows && previewRows.length > 0 ? (
                  <div
                    className='max-w-[150px] cursor-pointer truncate text-[13px] text-gray-10 transition-all hover:whitespace-normal hover:break-words'
                    title={String(previewRows[0]?.[excelColName] || '')}
                  >
                    {String(previewRows[0]?.[excelColName] || '')}
                  </div>
                ) : (
                  <div className='text-[13px] text-gray-8'>-</div>
                )}
              </div>

              {/* Combined Folder Field Picker */}
              <div className='col-span-6 flex items-center relative gap-3'>
                <div className='flex-1 relative'>
                  <div
                    className={cn(
                      'flex h-[36px] w-full cursor-pointer items-center justify-between rounded-lg border bg-surface px-3 font-normal transition-all duration-200 select-none',
                      isDropdownOpen ? 'border-primary-9 ring-2 ring-primary-9/20' : 'border-gray-3 hover:border-gray-4'
                    )}
                    onClick={(e) => {
                      e.stopPropagation()
                      setActiveDropdownRow(isDropdownOpen ? null : excelColName)
                      setSearchQuery('')
                    }}
                  >
                    <div className='flex min-w-0 items-center gap-2'>
                      {isMapped ? (
                        <>
                          <Tooltip content='Folder Field' position='top'>
                            <span className='inline-flex shrink-0' onClick={(e) => e.stopPropagation()}>
                              <Icon name='lucide:database' className='size-3.5 text-indigo-11' />
                            </span>
                          </Tooltip>
                          <span className='truncate text-[13px] font-normal'>{mappedRepoFieldName}</span>
                        </>
                      ) : (
                        <span className='truncate text-[13px] font-normal text-gray-9'>
                          Skip this field (unmapped)
                        </span>
                      )}
                    </div>

                    <div className='flex shrink-0 items-center gap-1.5'>
                      {/* Read-only Datatype icon for mapped folder fields */}
                      {isMapped && (
                        <Tooltip content={activeDataTypeObj.name} position='top'>
                          <div className='flex size-6 items-center justify-center rounded-md border border-transparent'>
                            <Icon className='size-3.5 shrink-0 text-gray-10' name={activeDataTypeObj.icon} />
                          </div>
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

                  {/* Folder Field Dropdown Selection */}
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
                            placeholder='Search folder fields...'
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className='flex-1 overflow-y-auto p-1.5 custom-scrollbar'>
                        <div className={MENU_LABEL_CLASS}>
                          <Icon className='size-3.5 text-indigo-11' name='lucide:database' />
                          Folder Fields
                        </div>
                        
                        <button
                          className={cn(
                            OPTION_ITEM_CLASS,
                            !isMapped ? OPTION_ITEM_SELECTED_CLASS : OPTION_ITEM_IDLE_CLASS,
                          )}
                          type='button'
                          onClick={() => {
                            if (isMapped) {
                              const newMapping = { ...mapping }
                              delete newMapping[mappedRepoFieldName]
                              onUpdateMapping(newMapping)
                              
                              if (onUpdateSyncFields) {
                                const newSync = syncFields.filter((s) => s !== mappedRepoFieldName)
                                onUpdateSyncFields(newSync)
                              }
                            }
                            setActiveDropdownRow(null)
                          }}
                        >
                          <CompactRadioIndicator checked={!isMapped} />
                          <span className={OPTION_LABEL_CLASS}>Skip this field (unmapped)</span>
                        </button>
                        
                        {filteredFields.length > 0 ? (
                          filteredFields.map((f) => {
                            const isAlreadyMapped = Object.values(mapping).includes(f.fieldName) && mapping[f.fieldName] !== excelColName;
                            return (
                            <button
                              className={cn(
                                OPTION_ITEM_CLASS,
                                mappedRepoFieldName === f.fieldName ? OPTION_ITEM_SELECTED_CLASS : OPTION_ITEM_IDLE_CLASS,
                                isAlreadyMapped && 'opacity-50 cursor-not-allowed'
                              )}
                              key={f.fieldName}
                              type='button'
                            disabled={isAlreadyMapped}
                            onClick={() => {
                              if (!isAlreadyMapped) {
                                const newMapping = { ...mapping }
                                // Remove any existing mapping for this excel col just in case
                                if (mappedRepoFieldName) {
                                  delete newMapping[mappedRepoFieldName]
                                }
                                newMapping[f.fieldName] = excelColName
                                onUpdateMapping(newMapping)
                                setActiveDropdownRow(null)
                              }
                            }}
                          >
                            <CompactRadioIndicator checked={mappedRepoFieldName === f.fieldName} />
                            <span className={cn(OPTION_LABEL_CLASS, isAlreadyMapped && 'text-gray-9 line-through')}>
                              {f.fieldName}
                            </span>
                            {isAlreadyMapped && (
                              <span className="text-[10px] text-gray-8 ml-auto">Already mapped</span>
                            )}
                          </button>
                        )})
                      ) : (
                        <div className='px-2 py-3 text-center text-12 text-gray-10'>
                          No fields found
                        </div>
                      )}
                    </div>
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
                      syncFields?.includes(mappedRepoFieldName) && isMapped ? 'border-primary-9 bg-primary-9' : 'border-gray-4 bg-surface',
                      isMapped && 'hover:border-primary-9'
                    )}>
                      {syncFields?.includes(mappedRepoFieldName) && isMapped && <Icon name='lucide:check' className='size-3.5 text-white' />}
                    </div>
                    <input 
                      type='checkbox' 
                      className='hidden' 
                      disabled={!isMapped}
                      checked={syncFields?.includes(mappedRepoFieldName) || false}
                      onChange={(e) => {
                        const checked = e.target.checked
                        let newSync = [...(syncFields || [])]
                        if (checked && !newSync.includes(mappedRepoFieldName)) {
                          newSync.push(mappedRepoFieldName)
                        } else if (!checked) {
                          newSync = newSync.filter(s => s !== mappedRepoFieldName)
                        }
                        onUpdateSyncFields?.(newSync)
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
          )
        })}

        {uploadedColumns.length === 0 && (
          <div className='py-8 text-center text-13 font-medium text-gray-10'>
            No uploaded columns found.
          </div>
        )}
      </div>
    </div>
  )
}
