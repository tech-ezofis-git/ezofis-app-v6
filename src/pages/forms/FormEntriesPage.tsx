import { useNavigate, useParams } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { Skeleton, Stack, Tooltip, Rating, Divider } from '@mantine/core'
import formApi from '@/api/form/form'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import InputText from '@/components/base/inputs/InputText'
import InputTextarea from '@/components/base/inputs/InputTextarea'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputSwitch from '@/components/base/inputs/InputSwitch'
import InputDate from '@/components/base/inputs/InputDate'
import InputNumber from '@/components/base/inputs/InputNumber'
import Tab from '@/components/base/tabs/Tab'
import Tabs from '@/components/base/tabs/Tabs'
import showToast from '@/components/base/toast/showToast'
import cn from '@/utils/cn'
import type { Question } from '@/pages/form-builder/store/formStore'

// DataTable and pagination imports
import DataTable from '@/components/base/data-table/DataTable'
import useDataTable from '@/components/base/data-table/hooks/useDataTable'
import useDataTableState from '@/components/base/data-table/hooks/useDataTableState'
import Pagination from '@/components/base/pagination/Pagination'
import type { Column } from '@/components/base/data-table/types'

// Helper to generate dynamic mock values based on field schema
const generateDummyEntries = (fields: Question[], count: number = 6) => {
  const sampleUsers = [
    'seth@ezofis.com',
    'alex@ezofis.com',
    'sarah@ezofis.com',
    'david@ezofis.com',
    'lisa@ezofis.com',
    'emily@ezofis.com',
  ]

  const activeFields = fields.length > 0 
    ? fields 
    : [
        { id: 'f1', label: 'Initial Value', type: 'SHORT_TEXT' } as Question,
        { id: 'f2', label: 'Status', type: 'SHORT_TEXT' } as Question
      ]

  return Array.from({ length: count }).map((_, idx) => {
    const entryId = `Entry #${idx + 1}`
    const values: Record<string, any> = {}

    activeFields.forEach((field) => {
      const type = (field.type || 'SHORT_TEXT').toUpperCase()
      const label = (field.label || '').toLowerCase()

      if (type === 'EMAIL' || label.includes('email')) {
        values[field.id] = `respondent${idx + 1}@ezofis.com`
      } else if (type === 'PHONE_NUMBER' || label.includes('phone') || label.includes('mobile')) {
        values[field.id] = `+1 555-010${idx + 1}`
      } else if (type === 'DATE' || label.includes('date')) {
        values[field.id] = `2026-06-0${idx + 1}`
      } else if (type === 'TIME' || label.includes('time')) {
        values[field.id] = `10:3${idx} AM`
      } else if (type === 'NUMBER' || type === 'COUNTER' || label.includes('age') || label.includes('qty')) {
        values[field.id] = Math.floor(Math.random() * 80) + 20
      } else if (type === 'CURRENCY_AMOUNT' || label.includes('amount') || label.includes('price')) {
        values[field.id] = `$${(Math.random() * 400 + 100).toFixed(2)}`
      } else if (type === 'YES_NO_TOGGLE' || type === 'CONSENT') {
        values[field.id] = idx % 2 === 0 ? 'Yes' : 'No'
      } else if (type === 'RATING') {
        values[field.id] = '⭐'.repeat((idx % 3) + 3)
      } else {
        // Fallbacks for generic inputs
        if (label.includes('name')) {
          const names = ['Emma Watson', 'James Smith', 'Sophia Jones', 'Michael Brown', 'Olivia Taylor', 'David Miller']
          values[field.id] = names[idx % names.length]
        } else if (label.includes('company')) {
          const companies = ['EZOFIS Corp', 'Google LLC', 'DeepMind Inc', 'Acme Systems', 'Globex Corp']
          values[field.id] = companies[idx % companies.length]
        } else if (label.includes('subject') || label.includes('issue')) {
          const issues = ['Billing query', 'Access request', 'Bug report', 'Feature feedback', 'General question']
          values[field.id] = issues[idx % issues.length]
        } else if (field.settings?.specific?.customOptions) {
          const optString = field.settings.specific.customOptions
          const delimiter = field.settings.specific.separateOptionsUsing === 'COMMA' ? ',' : '\n'
          const opts = optString.split(delimiter).map((o: any) => o.trim()).filter(Boolean)
          values[field.id] = opts.length > 0 ? opts[idx % opts.length] : `Option ${idx + 1}`
        } else {
          values[field.id] = `Sample ${field.label || 'Value'} ${idx + 1}`
        }
      }
    })

    return {
      id: entryId,
      values,
      createdBy: sampleUsers[idx % sampleUsers.length],
      createdAt: `2026-06-04T12:00:00.000Z`,
      isDeleted: false,
    }
  })
}

const FormEntriesPage = () => {
  const { formId } = useParams({ strict: false }) as any
  const navigate = useNavigate()

  const [entries, setEntries] = useState<any[]>([])
  const [trashEntries, setTrashEntries] = useState<any[]>([])
  const [tabValue, setTabValue] = useState<string>('Browse')
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editValues, setEditValues] = useState<Record<string, any>>({})
  const [deletingEntry, setDeletingEntry] = useState<{ id: string; type: 'trash' | 'permanent' } | null>(null)

  // Pagination states
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Fetch form schema
  const { data: formData, isLoading, isError, refetch } = useQuery({
    queryKey: ['forms', 'detail', formId],
    queryFn: async () => {
      const { data, error } = await formApi.getFormDataById(formId)
      if (error) throw new Error(error)
      return data
    },
    enabled: !!formId,
  })

  const panels = useMemo(() => {
    if (!formData) return []
    let json = formData._json || formData.formJson
    if (typeof json === 'string') {
      try {
        json = JSON.parse(json)
      } catch (e) {
        console.error('Failed to parse formJson:', e)
        json = null
      }
    }
    return json?.panels || []
  }, [formData])

  const fields = useMemo(() => panels.flatMap((p: any) => p.fields || []), [panels])
  
  // Set up standard data table state
  const {
    expandState,
    groupState,
    searchState,
    sortState,
    visibilityState,
    setExpandState,
    setVisibilityState,
    ...restState
  } = useDataTableState({
    initialVisibilityState: {},
  })

  // Initialize selected columns (first 5 fields visible by default)
  const [initialVisibilitySet, setInitialVisibilitySet] = useState(false)
  useEffect(() => {
    if (fields.length > 0 && !initialVisibilitySet) {
      const visibility: Record<string, boolean> = {}
      fields.forEach((field: Question, idx: number) => {
        visibility[field.id] = idx < 5
      })
      setVisibilityState(visibility)
      setInitialVisibilitySet(true)
    }
  }, [fields, initialVisibilitySet, setVisibilityState])

  // Populate dynamic mock data on load
  useEffect(() => {
    if (fields.length > 0 && entries.length === 0 && !isLoading) {
      const mock = generateDummyEntries(fields, 5)
      setEntries(mock)
    }
  }, [fields, isLoading])

  const handleFieldChange = (fieldId: string, val: any) => {
    setEditValues((prev) => ({ ...prev, [fieldId]: val }))
  }

  // Slide-in pane toggle functions
  const openNewEntry = () => {
    const initial: Record<string, any> = {}
    fields.forEach((f: Question) => {
      initial[f.id] = f.settings?.specific?.defaultValue || ''
    })
    setEditValues(initial)
    setSelectedEntry(null)
    setIsAddOpen(true)
  }

  const openEditEntry = (entry: any) => {
    setEditValues({ ...entry.values })
    setSelectedEntry(entry)
    setIsAddOpen(false)
  }

  const closeSidebar = () => {
    setIsAddOpen(false)
    setSelectedEntry(null)
    setEditValues({})
  }

  // Actions
  const handleSaveEntry = () => {
    if (isAddOpen) {
      const newEntry = {
        id: `Entry #${entries.length + trashEntries.length + 1}`,
        values: editValues,
        createdBy: 'seth@ezofis.com',
        createdAt: new Date().toISOString(),
        isDeleted: false,
      }
      setEntries((prev) => [newEntry, ...prev])
      showToast({ message: 'Entry created successfully!', variant: 'success' })
    } else if (selectedEntry) {
      setEntries((prev) =>
        prev.map((e) =>
          e.id === selectedEntry.id ? { ...e, values: editValues } : e
        )
      )
      showToast({ message: 'Entry updated successfully!', variant: 'success' })
    }
    closeSidebar()
  }

  const handleMoveToTrash = (entryId: string) => {
    const item = entries.find((e) => e.id === entryId)
    if (item) {
      setEntries((prev) => prev.filter((e) => e.id !== entryId))
      setTrashEntries((prev) => [{ ...item, isDeleted: true }, ...prev])
      showToast({ message: 'Entry moved to Trash', variant: 'success' })
      if (selectedEntry?.id === entryId) closeSidebar()
    }
  }

  const handleRestore = (entryId: string) => {
    const item = trashEntries.find((e) => e.id === entryId)
    if (item) {
      setTrashEntries((prev) => prev.filter((e) => e.id !== entryId))
      setEntries((prev) => [...prev, { ...item, isDeleted: false }])
      showToast({ message: 'Entry restored successfully', variant: 'success' })
    }
  }

  const handlePermanentDelete = (entryId: string) => {
    setTrashEntries((prev) => prev.filter((e) => e.id !== entryId))
    showToast({ message: 'Entry deleted permanently', variant: 'success' })
  }

  // Filtering based on active tab and search state
  const activeList = tabValue === 'Browse' ? entries : trashEntries
  const searchVal = searchState.value || ''

  // Reset page when tab, search value or sort changes
  useEffect(() => {
    setPage(1)
  }, [tabValue, searchVal, sortState])

  const filteredEntries = useMemo(() => {
    if (!searchVal.trim()) return activeList
    const q = searchVal.toLowerCase()
    return activeList.filter((entry) => {
      if (entry.id.toLowerCase().includes(q)) return true
      if (entry.createdBy.toLowerCase().includes(q)) return true
      return Object.values(entry.values).some((v) =>
        String(v).toLowerCase().includes(q)
      )
    })
  }, [activeList, searchVal])

  // Sorting
  const sortedAndFilteredEntries = useMemo(() => {
    const list = [...filteredEntries]
    if (sortState && sortState.length > 0) {
      const { id, desc } = sortState[0]
      list.sort((a, b) => {
        let valA, valB
        if (id === 'id') {
          valA = a.id
          valB = b.id
        } else if (id === 'createdBy') {
          valA = a.createdBy
          valB = b.createdBy
        } else {
          valA = a.values?.[id] ?? ''
          valB = b.values?.[id] ?? ''
        }

        if (typeof valA === 'string') {
          return desc
            ? String(valB).localeCompare(String(valA))
            : String(valA).localeCompare(String(valB))
        } else {
          return desc ? Number(valB) - Number(valA) : Number(valA) - Number(valB)
        }
      })
    }
    return list
  }, [filteredEntries, sortState])

  const totalItems = sortedAndFilteredEntries.length

  // Paginated list
  const paginatedEntries = useMemo(() => {
    const start = (page - 1) * pageSize
    const end = start + pageSize
    return sortedAndFilteredEntries.slice(start, end)
  }, [sortedAndFilteredEntries, page, pageSize])

  // Build Table Columns dynamically
  const columns: Column[] = useMemo(() => {
    const colList: Column[] = [
      {
        id: 'id',
        label: 'Entry #',
        size: 120,
        renderCell: (row: any) => (
          <span
            className='cursor-pointer font-bold text-[var(--primary-9)] hover:underline'
            onClick={() => openEditEntry(row)}
          >
            {row.id}
          </span>
        ),
      },
    ]

    // Render dynamic columns from fields
    fields.forEach((field: Question) => {
      colList.push({
        id: field.id,
        label: field.label || 'Untitled Field',
        size: 180,
        renderCell: (row: any) => {
          const val = row.values?.[field.id]
          return (
            <span className='truncate block max-w-[200px] font-medium text-[var(--gray-12)]'>
              {val !== undefined && val !== null ? String(val) : '-'}
            </span>
          )
        },
      })
    })

    if (fields.length === 0) {
      colList.push(
        {
          id: 'empty-1',
          label: 'Placeholder Column 1',
          size: 180,
          renderCell: () => <span className='text-[var(--gray-6)] italic'>Empty form field</span>,
        },
        {
          id: 'empty-2',
          label: 'Placeholder Column 2',
          size: 180,
          renderCell: () => <span className='text-[var(--gray-6)] italic'>Empty form field</span>,
        }
      )
    }

    colList.push(
      {
        id: 'createdBy',
        label: 'Created By',
        size: 180,
        renderCell: (row: any) => (
          <span className='font-medium text-[var(--gray-12)]'>{row.createdBy}</span>
        ),
      },
      {
        className: 'p-1',
        enableSorting: false,
        hideHeader: true,
        id: 'actions',
        isDisplayColumn: true,
        label: 'Actions',
        showMenu: false,
        size: 80,
        renderCell: (row: any) => (
          <div className='flex items-center justify-end gap-1.5' onClick={(e) => e.stopPropagation()}>
            {tabValue === 'Browse' ? (
              <>
                <Tooltip label='Edit Entry'>
                  <IconButton
                    color='gray'
                    variant='ghost'
                    icon='lucide:pencil'
                    onClick={() => openEditEntry(row)}
                  />
                </Tooltip>
                <Tooltip label='Move to Trash'>
                  <IconButton
                    color='red'
                    variant='ghost'
                    icon='lucide:trash-2'
                    onClick={() => setDeletingEntry({ id: row.id, type: 'trash' })}
                  />
                </Tooltip>
              </>
            ) : (
              <>
                <Tooltip label='Restore Entry'>
                  <IconButton
                    color='green'
                    variant='ghost'
                    icon='lucide:rotate-ccw'
                    onClick={() => handleRestore(row.id)}
                  />
                </Tooltip>
                <Tooltip label='Permanent Delete'>
                  <IconButton
                    color='red'
                    variant='ghost'
                    icon='lucide:trash-2'
                    onClick={() => setDeletingEntry({ id: row.id, type: 'permanent' })}
                  />
                </Tooltip>
              </>
            )}
          </div>
        ),
      }
    )

    return colList
  }, [fields, tabValue])

  // Map flat paginated entries to DataTable format
  const formattedRows = useMemo(() => {
    return [
      {
        groupCount: paginatedEntries.length,
        groupId: 'all',
        groupKey: '',
        groupValue: '',
        items: paginatedEntries,
      },
    ]
  }, [paginatedEntries])

  const { table } = useDataTable({
    columns,
    enableRowSelection: false,
    rows: formattedRows as any,
    state: {
      expandState,
      groupState,
      searchState,
      sortState,
      visibilityState,
      setExpandState,
      setVisibilityState,
      ...restState,
    },
  })

  // Skeleton Loader for initial fetching
  if (isLoading) {
    return (
      <div className='flex h-full flex-col p-8 bg-gray-50/20'>
        <div className='flex items-center justify-between border-b border-gray-2 pb-4 mb-6'>
          <Stack gap='xs'>
            <Skeleton height={14} width={120} />
            <Skeleton height={28} width={240} />
          </Stack>
          <Skeleton height={40} width={130} radius='md' />
        </div>
        <Skeleton height={45} className='mb-4' radius='md' />
        <Skeleton height={300} className='flex-1' radius='md' />
      </div>
    )
  }

  if (isError) {
    return (
      <div className='flex h-full flex-col items-center justify-center bg-gray-50/20 p-8'>
        <div className='flex size-14 items-center justify-center rounded-2xl bg-red-2 text-red-11 mb-4 border border-red-3'>
          <Icon name='lucide:alert-circle' className='size-7 animate-bounce' />
        </div>
        <h3 className='text-lg font-bold text-gray-12'>Failed to load form</h3>
        <p className='text-xs text-gray-7 mt-1 max-w-[280px] text-center'>
          The form may have been deleted, or there was a database networking error.
        </p>
        <Button className='mt-6' label='Retry Loading' icon='lucide:rotate-cw' onClick={() => refetch()} />
      </div>
    )
  }

  const isPanelOpen = isAddOpen || !!selectedEntry

  if (isPanelOpen) {
    return (
      <div className='flex h-full flex-col bg-gray-50/10 font-inter'>
        {/* Form Header */}
        <div className='flex shrink-0 items-center justify-between border-b border-gray-2 px-6 py-4 bg-white'>
          <div className='flex items-center gap-3 min-w-0'>
            <IconButton
              color='gray'
              variant='ghost'
              icon='lucide:arrow-left'
              onClick={closeSidebar}
              title='Back to Entries'
            />
            <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft/10 text-accent-primary'>
              <Icon height={18} name={isAddOpen ? 'lucide:file-plus-2' : 'lucide:file-edit'} width={18} />
            </div>
            <div className='flex flex-col min-w-0'>
              <h3 className='font-extrabold text-[14px] text-gray-13 truncate'>
                {isAddOpen ? 'New Form Entry' : selectedEntry?.id}
              </h3>
              <p className='text-[10px] text-gray-7 uppercase tracking-wider font-semibold truncate'>
                {isAddOpen ? 'Submit answers to form' : 'Modify submitted answers'}
              </p>
            </div>
          </div>
          <div className='flex items-center gap-3'>
            <Button
              color='gray'
              variant='outline'
              label='Cancel'
              onClick={closeSidebar}
            />
            <Button
              color='primary'
              variant='solid'
              icon='lucide:save'
              label={isAddOpen ? 'Submit' : 'Save Changes'}
              onClick={handleSaveEntry}
            />
          </div>
        </div>

        {/* Scrollable Form Body (similar to Form Builder style) */}
        <div className='flex-1 overflow-y-auto bg-[var(--gray-2)]/30 px-6 py-8 custom-scrollbar'>
          <div className='mx-auto max-w-[800px] w-full bg-white rounded-2xl border border-[var(--gray-3)] shadow-md p-8 space-y-6'>
            {fields.map((field: Question) => {
              const type = (field.type || 'SHORT_TEXT').toUpperCase()
              const val = editValues[field.id] ?? ''
              const isFieldRequired = field.settings?.validation?.fieldRule === 'REQUIRED'

              return (
                <div key={field.id} className='border-b border-gray-1 pb-6 last:border-0 last:pb-0'>
                  {/* Handle divider / heading types specially (no labels/inputs needed) */}
                  {type === 'DIVIDER' ? (
                    <Divider className='my-4' />
                  ) : type === 'HEADING' ? (
                    <h3 className='text-lg font-bold text-gray-13'>{field.label || 'Heading Section'}</h3>
                  ) : (
                    <>
                      {/* Label / Description wrapper */}
                      <div className='mb-2'>
                        <label className='block text-sm font-bold text-gray-12'>
                          {field.label || 'Untitled Question'}
                          {isFieldRequired && <span className='text-red-9 ml-1'>*</span>}
                        </label>
                        {field.settings?.general?.description && (
                          <span className='block text-xs text-gray-7 mt-0.5'>{field.settings.general.description}</span>
                        )}
                      </div>

                      {/* Render matching dynamic form control */}
                      {type === 'YES_NO_TOGGLE' || type === 'CONSENT' ? (
                        <div className='bg-gray-50/50 flex items-center justify-between rounded-xl border border-gray-2 p-3 transition-colors hover:border-gray-3 max-w-xs'>
                          <span className='text-xs font-semibold text-gray-11'>Consent / Enable</span>
                          <InputSwitch
                            checked={val === 'Yes'}
                            onChange={(checked) => handleFieldChange(field.id, checked ? 'Yes' : 'No')}
                          />
                        </div>
                      ) : type === 'DATE' ? (
                        <InputDate
                          placeholder={field.settings?.general?.placeholder || 'Select Date'}
                          value={val ? val : null}
                          onChange={(dateString) => handleFieldChange(field.id, dateString)}
                        />
                      ) : type === 'NUMBER' || type === 'COUNTER' ? (
                        <InputNumber
                          placeholder={field.settings?.general?.placeholder || 'Enter value'}
                          value={val}
                          onChange={(num) => handleFieldChange(field.id, num)}
                        />
                      ) : type === 'CURRENCY_AMOUNT' ? (
                        <div className='relative max-w-xs'>
                          <span className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-8 text-sm font-bold'>$</span>
                          <InputNumber
                            placeholder={field.settings?.general?.placeholder || '0.00'}
                            value={val}
                            classNames={{
                              input: 'pl-8'
                            }}
                            onChange={(num) => handleFieldChange(field.id, num)}
                          />
                        </div>
                      ) : type === 'RATING' ? (
                        <div className='py-2'>
                          <Rating
                            color='yellow'
                            count={field.settings?.specific?.iconCount || 5}
                            value={Number(val || 0)}
                            size='lg'
                            onChange={(v) => handleFieldChange(field.id, v)}
                          />
                        </div>
                      ) : type === 'OPINION_SCALE' ? (
                        <div className='flex gap-1 flex-wrap py-1'>
                          {Array.from({ length: 11 }).map((_, i) => {
                            const isSelected = Number(val) === i && val !== ''
                            return (
                              <button
                                key={i}
                                type='button'
                                className={cn(
                                  'size-10 rounded-lg border font-bold text-sm transition-all hover:bg-accent-soft hover:text-accent-primary active:scale-95',
                                  isSelected
                                    ? 'bg-accent-primary text-white border-accent-primary'
                                    : 'bg-white text-gray-12 border-gray-3'
                                )}
                                onClick={() => handleFieldChange(field.id, i)}
                              >
                                {i}
                              </button>
                            )
                          })}
                        </div>
                      ) : type === 'SINGLE_CHOICE' ? (
                        (() => {
                          const optString = field.settings?.specific?.customOptions || 'Option A,Option B,Option C'
                          const delimiter = field.settings?.specific?.separateOptionsUsing === 'COMMA' ? ',' : '\n'
                          const opts = optString
                            .split(delimiter)
                            .map((o: any) => o.trim())
                            .filter(Boolean)

                          return (
                            <div className='space-y-2 max-w-md'>
                              {opts.map((opt: string) => {
                                const isSelected = val === opt
                                return (
                                  <button
                                    key={opt}
                                    type='button'
                                    className={cn(
                                      'flex items-center gap-3 w-full rounded-xl border p-3 text-left transition-all hover:bg-gray-1 active:scale-[0.99]',
                                      isSelected
                                        ? 'border-accent-primary bg-accent-soft/10 text-accent-primary font-bold'
                                        : 'border-gray-2 bg-white text-gray-12'
                                    )}
                                    onClick={() => handleFieldChange(field.id, opt)}
                                  >
                                    <div className='flex items-center justify-center border rounded-full size-5 border-gray-3 shrink-0'>
                                      {isSelected && <div className='size-2.5 rounded-full bg-accent-primary' />}
                                    </div>
                                    <span className='text-sm'>{opt}</span>
                                  </button>
                                )
                              })}
                            </div>
                          )
                        })()
                      ) : type === 'MULTIPLE_CHOICE' ? (
                        (() => {
                          const optString = field.settings?.specific?.customOptions || 'Option A,Option B,Option C'
                          const delimiter = field.settings?.specific?.separateOptionsUsing === 'COMMA' ? ',' : '\n'
                          const opts = optString
                            .split(delimiter)
                            .map((o: any) => o.trim())
                            .filter(Boolean)

                          const selectedList = Array.isArray(val) ? val : (val ? String(val).split(',') : [])

                          const toggleOpt = (opt: string) => {
                            const next = selectedList.includes(opt)
                              ? selectedList.filter((x) => x !== opt)
                              : [...selectedList, opt]
                            handleFieldChange(field.id, next.join(','))
                          }

                          return (
                            <div className='space-y-2 max-w-md'>
                              {opts.map((opt: string) => {
                                const isSelected = selectedList.includes(opt)
                                return (
                                  <button
                                    key={opt}
                                    type='button'
                                    className={cn(
                                      'flex items-center gap-3 w-full rounded-xl border p-3 text-left transition-all hover:bg-gray-1 active:scale-[0.99]',
                                      isSelected
                                        ? 'border-accent-primary bg-accent-soft/10 text-accent-primary font-bold'
                                        : 'border-gray-2 bg-white text-gray-12'
                                    )}
                                    onClick={() => toggleOpt(opt)}
                                  >
                                    <div className='flex items-center justify-center border rounded-md size-5 border-gray-3 shrink-0'>
                                      {isSelected && <Icon name='lucide:check' className='size-3.5 text-accent-primary' />}
                                    </div>
                                    <span className='text-sm'>{opt}</span>
                                  </button>
                                )
                              })}
                            </div>
                          )
                        })()
                      ) : type === 'SINGLE_SELECT' || type === 'MULTI_SELECT' ? (
                        (() => {
                          const optString = field.settings?.specific?.customOptions || 'Option A,Option B,Option C'
                          const delimiter = field.settings?.specific?.separateOptionsUsing === 'COMMA' ? ',' : '\n'
                          const opts = optString
                            .split(delimiter)
                            .map((o: any) => o.trim())
                            .filter(Boolean)
                            .map((o: string) => ({ id: o, name: o }))

                          const selectedOpt = val ? { id: val, name: val } : null

                          return (
                            <InputSelect
                              placeholder={field.settings?.general?.placeholder || 'Select option'}
                              options={opts}
                              value={selectedOpt}
                              onChange={(opt) => handleFieldChange(field.id, opt ? opt.id : '')}
                            />
                          )
                        })()
                      ) : type === 'FILE_UPLOAD' || type === 'IMAGE_UPLOAD' ? (
                        <div className='bg-gray-50 flex items-center justify-between rounded-xl border border-gray-2 p-3 max-w-md'>
                          <div className='flex items-center gap-2'>
                            <Icon name='lucide:upload-cloud' className='size-5 text-gray-8' />
                            <span className='text-xs font-semibold text-gray-11'>Upload dynamic documents / media</span>
                          </div>
                          <IconButton icon='lucide:upload' color='gray' variant='outline' onClick={() => showToast({ message: 'File picker simulated successfully' })} />
                        </div>
                      ) : type === 'LONG_TEXT' ? (
                        <InputTextarea
                          placeholder={field.settings?.general?.placeholder || 'Write here...'}
                          value={val}
                          onChange={(text) => handleFieldChange(field.id, text)}
                        />
                      ) : (
                        <InputText
                          placeholder={field.settings?.general?.placeholder || 'Type answer...'}
                          value={val}
                          onChange={(text) => handleFieldChange(field.id, text)}
                        />
                      )}
                    </>
                  )}
                </div>
              )
            })}

            {fields.length === 0 && (
              <div className='py-12 text-center text-xs text-gray-5 bg-gray-50 border border-dashed border-gray-3 rounded-2xl'>
                This form currently has no input fields.
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='flex h-full flex-col bg-gray-50/10 font-inter'>
      {/* 1. TAB SUB-HEADER */}
      <div className='flex items-center justify-between border-b border-gray-3 px-6 md:px-8 bg-white shrink-0 h-14'>
        <div className='flex items-center gap-4'>
          <IconButton
            icon='lucide:arrow-left'
            color='gray'
            variant='ghost'
            onClick={() => navigate({ to: '/forms' })}
            title='Back to Forms'
          />
          <Tabs
            color='primary'
            value={tabValue}
            onChange={(val) => setTabValue(val || 'Browse')}
          >
            <Tab label='Browse' value='Browse' />
            <Tab label='Trash' value='Trash' />
          </Tabs>
        </div>

        <Button
          color='primary'
          variant='solid'
          icon='lucide:plus'
          label='Add Entry'
          onClick={openNewEntry}
        />
      </div>

      {deletingEntry && (
        <div className='mx-6 mt-4 flex animate-in fade-in slide-in-from-top-4 duration-300 items-center justify-between gap-4 rounded-xl border border-red-3 bg-red-2 p-4 text-red-11 shadow-sm'>
          <div className='flex items-center gap-3'>
            <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-3 text-red-11'>
              <Icon className='h-5 w-5 text-red-11 animate-pulse' name='lucide:triangle-alert' />
            </div>
            <div>
              <h4 className='text-sm font-semibold text-red-12'>
                {deletingEntry.type === 'trash' ? 'Move Entry to Trash' : 'Permanently Delete Entry'}
              </h4>
              <p className='text-xs text-red-11 mt-0.5'>
                {deletingEntry.type === 'trash' ? (
                  <>Are you sure you want to move <span className='font-bold text-red-12'>{deletingEntry.id}</span> to Trash?</>
                ) : (
                  <>Are you sure you want to permanently delete <span className='font-bold text-red-12'>{deletingEntry.id}</span>? This action is permanent and cannot be undone.</>
                )}
              </p>
            </div>
          </div>
          <div className='flex items-center gap-2 shrink-0'>
            <Button
              color='gray'
              variant='subtle'
              size='sm'
              onClick={() => setDeletingEntry(null)}
            >
              Cancel
            </Button>
            <Button
              color='red'
              variant='solid'
              size='sm'
              icon='lucide:trash-2'
              onClick={() => {
                if (deletingEntry.type === 'trash') {
                  handleMoveToTrash(deletingEntry.id)
                } else {
                  handlePermanentDelete(deletingEntry.id)
                }
                setDeletingEntry(null)
              }}
            >
              {deletingEntry.type === 'trash' ? 'Move to Trash' : 'Delete Permanently'}
            </Button>
          </div>
        </div>
      )}

      {/* 2. MAIN LAYOUT (Table view) */}
      <div className='flex flex-1 overflow-hidden relative'>
        <div className='flex flex-1 flex-col overflow-hidden bg-gray-50/50 p-6'>
          <div className='min-h-0 flex-1 overflow-hidden'>
            <DataTable
              isLoading={isLoading}
              isReLoading={isLoading}
              pageSize={pageSize}
              stickyHeader={true}
              table={table}
              actions={[]}
              onReload={refetch}
            />
          </div>
          <Pagination
            className='mt-4 shrink-0'
            itemLabel='Entries'
            page={page}
            pageSize={pageSize}
            showPageNumbers={false}
            totalItems={totalItems}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      </div>
    </div>
  )
}

FormEntriesPage.displayName = 'FormEntriesPage'
export default FormEntriesPage
