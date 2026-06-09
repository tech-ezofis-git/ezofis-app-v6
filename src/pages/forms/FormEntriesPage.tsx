import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { Skeleton, Stack, Tooltip } from '@mantine/core'
import Badge from '@/components/base/Badge'
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
  const [search, setSearch] = useState('')
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editValues, setEditValues] = useState<Record<string, any>>({})
  const [selectedColumns, setSelectedColumns] = useState<string[]>([])
  const [isColumnsVisible, setIsColumnsVisible] = useState(false)
  const [deletingEntry, setDeletingEntry] = useState<{ id: string; type: 'trash' | 'permanent' } | null>(null)

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

  const formName = useMemo(() => {
    if (!formData) return 'Loading...'
    return formData._json?.settings?.general?.name || formData.name || 'Untitled Form'
  }, [formData])

  const panels = useMemo(() => formData?.formJson?.panels || [], [formData])
  const fields = useMemo(() => panels.flatMap((p: any) => p.fields || []), [panels])
  
  // Filter columns based on user selection
  const displayedFields = useMemo(() => {
    return fields.filter((field: Question) => selectedColumns.includes(field.id))
  }, [fields, selectedColumns])

  // Determine if the form is published or draft
  const publishOption = useMemo(() => {
    if (!formData) return 'DRAFT'
    
    let json = formData._json || formData.formJson
    if (typeof json === 'string') {
      try {
        json = JSON.parse(json)
      } catch (e) {
        json = null
      }
    }
    
    return (
      json?.settings?.publish?.publishOption ||
      formData.publishOption ||
      'DRAFT'
    )
  }, [formData])

  const isPublished = useMemo(() => {
    return publishOption.toUpperCase() === 'PUBLISHED'
  }, [publishOption])

  // Initialize selected columns
  useEffect(() => {
    if (fields.length > 0 && selectedColumns.length === 0) {
      // If fields <= 5, select all. Otherwise, select first 5.
      const initial = fields.slice(0, 5).map((f: Question) => f.id)
      setSelectedColumns(initial)
    }
  }, [fields, selectedColumns.length])

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

  // Filtering
  const activeList = tabValue === 'Browse' ? entries : trashEntries

  const filteredEntries = useMemo(() => {
    if (!search.trim()) return activeList
    const q = search.toLowerCase()
    return activeList.filter((entry) => {
      if (entry.id.toLowerCase().includes(q)) return true
      if (entry.createdBy.toLowerCase().includes(q)) return true
      return Object.values(entry.values).some((v) =>
        String(v).toLowerCase().includes(q)
      )
    })
  }, [activeList, search])

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

  return (
    <div className='flex h-full flex-col bg-gray-50/10 font-inter'>
      {/* 1. BREADCRUMBS & ACTION HEADER */}
      <div className='flex flex-wrap items-center justify-between gap-4 bg-white px-6 py-2 md:px-8 border-b border-[var(--gray-2)]'>
        <div className='flex items-center gap-2 text-[13px] font-bold text-[var(--gray-12)] min-w-0 flex-wrap'>
          <span
            className='cursor-pointer text-[var(--gray-9)] hover:text-[var(--primary-9)] transition-colors'
            onClick={() => navigate({ to: '/forms' })}
          >
            Forms
          </span>
          <Icon name='lucide:chevron-right' className='size-3 text-[var(--gray-5)] shrink-0' />
          <span className='text-[var(--gray-9)]'>Entries</span>
          <Icon name='lucide:chevron-right' className='size-3 text-[var(--gray-5)] shrink-0' />
          <h1 className='text-sm font-extrabold text-[var(--gray-13)] truncate max-w-[280px]'>
            {formName}
          </h1>
          <Badge
            color={isPublished ? 'green' : 'gray'}
            label={publishOption}
            className='text-[9px] py-0.5 px-2 font-black shrink-0'
          />
        </div>

        {/* Global Toolbar buttons */}
        <div className='flex items-center gap-2.5'>
          <Button
            color='gray'
            variant='outline'
            size='sm'
            icon='lucide:edit-3'
            label='Edit Form Structure'
            onClick={() =>
              navigate({
                params: { formId },
                to: '/form-builder/$formId',
              })
            }
          />
          <Button
            color='primary'
            variant='solid'
            size='sm'
            icon='lucide:plus'
            label='Add Entry'
            onClick={openNewEntry}
          />
        </div>
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

      {/* 2. MAIN LAYOUT (Master-Detail Split Panel) */}
      <div className='flex flex-1 overflow-hidden relative'>
        
        {/* Left Columns Selector Sidebar (Reflow Layout) */}
        {isColumnsVisible && (
          <div className='w-[240px] shrink-0 border-r border-[var(--gray-3)] bg-white flex flex-col h-full animate-in slide-in-from-left duration-200 z-10'>
            <div className='flex shrink-0 items-center justify-between border-b border-[var(--gray-2)] px-4 py-3 bg-[var(--gray-1)]/50'>
              <div className='flex items-center gap-2'>
                <Icon name='lucide:columns' className='size-3.5 text-[var(--gray-9)]' />
                <span className='text-xs font-bold text-[var(--gray-12)]'>Columns</span>
              </div>
              <span className='text-[10px] text-[var(--gray-7)] font-black uppercase tracking-wider bg-[var(--gray-2)] px-1.5 py-0.5 rounded border border-[var(--gray-3)]'>
                {selectedColumns.length} / {fields.length}
              </span>
            </div>
            
            <div className='flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar bg-white'>
              {fields.map((field: Question) => {
                const isChecked = selectedColumns.includes(field.id)
                return (
                  <label
                    key={field.id}
                    className='flex items-start gap-2.5 rounded-lg p-2 hover:bg-[var(--gray-1)] cursor-pointer select-none transition-colors border border-transparent hover:border-[var(--gray-2)]'
                  >
                    <input
                      type='checkbox'
                      checked={isChecked}
                      className='mt-0.5 rounded border-[var(--gray-3)] text-[var(--primary-9)] focus:ring-[var(--primary-4)]/20'
                      onChange={() => {
                        setSelectedColumns((prev) =>
                          isChecked
                            ? prev.filter((id) => id !== field.id)
                            : [...prev, field.id]
                        )
                      }}
                    />
                    <div className='flex flex-col min-w-0'>
                      <span className='text-xs font-semibold text-[var(--gray-12)] truncate'>
                        {field.label || 'Untitled Field'}
                      </span>
                      <span className='text-[9px] text-[var(--gray-7)] uppercase tracking-wider font-semibold'>
                        {field.type.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </label>
                )
              })}
              {fields.length === 0 && (
                <div className='py-8 text-center text-xs text-[var(--gray-6)] italic'>
                  No fields available.
                </div>
              )}
            </div>

            <div className='border-t border-[var(--gray-2)] px-4 py-2.5 bg-[var(--gray-1)]/50 flex justify-between gap-2 shrink-0'>
              <button
                className='text-[10px] font-bold text-[var(--primary-9)] hover:text-[var(--primary-10)] transition-colors'
                onClick={() => setSelectedColumns(fields.map((f: Question) => f.id))}
              >
                Select All
              </button>
              <button
                className='text-[10px] font-bold text-[var(--gray-8)] hover:text-[var(--gray-11)] transition-colors'
                onClick={() => setSelectedColumns([])}
              >
                Clear All
              </button>
            </div>
          </div>
        )}

        {/* Left Side: Entries List (Takes remaining width) */}
        <div className='flex flex-1 flex-col overflow-hidden'>
          
          {/* Tab Sub-Header & Controls */}
          <div className='flex items-center justify-between border-b border-[var(--gray-3)] bg-white px-6 md:px-8 py-1'>
            <Tabs
              color='primary'
              value={tabValue}
              onChange={(val) => setTabValue(val || 'Browse')}
            >
              <Tab label='Browse' value='Browse' />
              <Tab label='Trash' value='Trash' />
            </Tabs>

            {/* Quick search & refresh controls */}
            <div className='flex items-center gap-3 py-1'>
              <div className='relative group'>
                <Icon
                  name='lucide:search'
                  className='absolute top-1/2 left-3 -translate-y-1/2 size-3.5 text-gray-4 group-focus-within:text-accent-primary transition-colors'
                />
                <input
                  type='text'
                  placeholder='Search entries...'
                  value={search}
                  className='bg-gray-50/50 w-52 rounded-lg border border-gray-2 py-1 pl-9 pr-3 text-xs font-semibold transition-all outline-none focus:border-accent-primary focus:bg-white focus:ring-2 focus:ring-accent-soft/20'
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Tooltip label='Toggle columns visibility'>
                <IconButton
                  color='gray'
                  variant={isColumnsVisible ? 'solid' : 'ghost'}
                  icon='lucide:columns'
                  onClick={() => setIsColumnsVisible((prev) => !prev)}
                />
              </Tooltip>
              <Tooltip label='Refresh entries list'>
                <IconButton
                  color='gray'
                  variant='ghost'
                  icon='lucide:rotate-cw'
                  onClick={() => {
                    refetch()
                    showToast({ message: 'Entries refreshed' })
                  }}
                />
              </Tooltip>
            </div>
          </div>

          {/* Scrollable table content area */}
          <div className='flex-1 overflow-auto bg-[var(--gray-2)]/30 px-6 py-4 md:px-8'>
            <div className='overflow-x-auto rounded-xl border border-[var(--gray-3)] bg-white shadow-sm minimal-scrollbar'>
              <table className='w-full border-separate border-spacing-0 text-left text-[13px]' style={{ minWidth: `max(100%, ${(displayedFields.length + 3) * 160}px)` }}>
                <thead>
                  <tr className='bg-[var(--gray-2)] border-b border-[var(--gray-3)]'>
                    <th className='border-b border-[var(--gray-3)] py-3 pl-6 pr-3 text-xs font-semibold uppercase tracking-wider text-[var(--gray-9)]'>
                      Entry #
                    </th>
                    
                    {/* Render dynamic columns from fields */}
                    {displayedFields.map((field: Question) => (
                      <th
                        key={field.id}
                        className='border-b border-[var(--gray-3)] py-3 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--gray-9)]'
                      >
                        {field.label || 'Untitled Field'}
                      </th>
                    ))}

                    {fields.length === 0 && (
                      <>
                        <th className='border-b border-[var(--gray-3)] py-3 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--gray-9)]'>Placeholder Column 1</th>
                        <th className='border-b border-[var(--gray-3)] py-3 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--gray-9)]'>Placeholder Column 2</th>
                      </>
                    )}

                    <th className='border-b border-[var(--gray-3)] py-3 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--gray-9)]'>
                      Created By
                    </th>
                    <th className='border-b border-[var(--gray-3)] py-3 pr-6 pl-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--gray-9)]'>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((row) => (
                    <tr
                      key={row.id}
                      className={cn(
                        'group transition-all hover:bg-[var(--gray-1)] cursor-pointer',
                        selectedEntry?.id === row.id && 'bg-[var(--primary-2)]/30 hover:bg-[var(--primary-2)]/40'
                      )}
                      onClick={() => openEditEntry(row)}
                    >
                      <td className='border-b border-[var(--gray-2)] py-2.5 pl-6 pr-3 font-bold text-[var(--primary-9)] hover:underline select-none'>
                        {row.id}
                      </td>

                      {/* Render dynamic columns values */}
                      {displayedFields.map((field: Question) => (
                        <td
                          key={field.id}
                          className='border-b border-[var(--gray-2)] py-2.5 px-3 font-medium text-[var(--gray-12)] truncate max-w-[200px]'
                        >
                          {String(row.values[field.id] ?? '-')}
                        </td>
                      ))}

                      {fields.length === 0 && (
                        <>
                          <td className='border-b border-[var(--gray-2)] py-2.5 px-3 text-[var(--gray-6)] italic'>Empty form field</td>
                          <td className='border-b border-[var(--gray-2)] py-2.5 px-3 text-[var(--gray-6)] italic'>Empty form field</td>
                        </>
                      )}

                      <td className='border-b border-[var(--gray-2)] py-2.5 px-3 font-medium text-[var(--gray-12)]'>
                        {row.createdBy}
                      </td>
                      <td className='border-b border-[var(--gray-2)] py-2.5 pr-6 pl-3 text-right' onClick={(e) => e.stopPropagation()}>
                        <div className='flex items-center justify-end gap-1.5'>
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
                      </td>
                    </tr>
                  ))}
                  {filteredEntries.length === 0 && (
                    <tr>
                      <td
                        colSpan={displayedFields.length + 3 + (fields.length === 0 ? 2 : 0)}
                        className='py-20 text-center border-b border-[var(--gray-2)]'
                      >
                        <div className='flex flex-col items-center justify-center'>
                          <div className='flex size-11 items-center justify-center rounded-xl bg-gray-2 text-gray-7 mb-3'>
                            <Icon name='lucide:database-backup' className='size-5' />
                          </div>
                          <div className='text-xs font-bold text-gray-12'>No entries found</div>
                          <p className='text-[11px] text-gray-6 mt-1'>
                            {search ? 'Try adjusting your search filters.' : 'Click "+ Add Entry" to submit your first entry.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Side: Flat-Focus Entry Panel (Slides in side-by-side) */}
        {isPanelOpen && (
          <div className='w-[420px] shrink-0 border-l border-gray-3 bg-white shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300 relative z-30'>
            {/* Sidebar Header */}
            <div className='flex shrink-0 items-center justify-between border-b border-gray-2 px-5 py-4 bg-gradient-to-b from-gray-1 to-white'>
              <div className='flex items-center gap-2.5 min-w-0'>
                <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft/10 text-accent-primary'>
                  <Icon height={18} name={isAddOpen ? 'lucide:file-plus-2' : 'lucide:file-edit'} width={18} />
                </div>
                <div className='flex flex-col min-w-0'>
                  <h3 className='font-extrabold text-[14px] text-gray-13 truncate'>
                    {isAddOpen ? 'New Form Entry' : selectedEntry?.id}
                  </h3>
                  <p className='text-[10px] text-gray-7 uppercase tracking-wider font-semibold truncate'>
                    {isAddOpen ? 'Submit answers' : 'Modify submitted answers'}
                  </p>
                </div>
              </div>
              <IconButton
                color='gray'
                variant='ghost'
                icon='lucide:x'
                className='rounded-xl'
                onClick={closeSidebar}
              />
            </div>

            {/* Sidebar Scrollable Content Form */}
            <div className='flex-1 overflow-y-auto px-5 py-6 space-y-5 custom-scrollbar'>
              {fields.map((field: Question) => {
                const type = (field.type || 'SHORT_TEXT').toUpperCase()
                const val = editValues[field.id] ?? ''
                const isFieldRequired = field.settings?.validation?.fieldRule === 'REQUIRED'

                // Render matching dynamic form control
                if (type === 'YES_NO_TOGGLE' || type === 'CONSENT') {
                  return (
                    <div
                      key={field.id}
                      className='bg-gray-50/50 flex items-center justify-between rounded-xl border border-gray-2 p-3 transition-colors hover:border-gray-3'
                    >
                      <div className='flex flex-col pr-4 min-w-0'>
                        <span className='text-[13px] font-bold text-gray-12 truncate'>{field.label}</span>
                        {field.settings?.general?.description && (
                          <span className='text-[11px] text-gray-6 mt-0.5'>{field.settings.general.description}</span>
                        )}
                      </div>
                      <InputSwitch
                        checked={val === 'Yes'}
                        onChange={(checked) => handleFieldChange(field.id, checked ? 'Yes' : 'No')}
                      />
                    </div>
                  )
                }

                if (type === 'DATE') {
                  return (
                    <div key={field.id}>
                      <InputDate
                        label={field.label || 'Date'}
                        required={isFieldRequired}
                        placeholder={field.settings?.general?.placeholder || 'Select Date'}
                        description={field.settings?.general?.description}
                        value={val ? val : null}
                        onChange={(dateString) => handleFieldChange(field.id, dateString)}
                      />
                    </div>
                  )
                }

                if (type === 'NUMBER' || type === 'COUNTER') {
                  return (
                    <div key={field.id}>
                      <InputNumber
                        label={field.label || 'Number'}
                        required={isFieldRequired}
                        placeholder={field.settings?.general?.placeholder || 'Enter value'}
                        description={field.settings?.general?.description}
                        value={val}
                        onChange={(num) => handleFieldChange(field.id, num)}
                      />
                    </div>
                  )
                }

                if (type === 'LONG_TEXT') {
                  return (
                    <div key={field.id}>
                      <InputTextarea
                        label={field.label || 'Description'}
                        required={isFieldRequired}
                        placeholder={field.settings?.general?.placeholder || 'Write here...'}
                        description={field.settings?.general?.description}
                        value={val}
                        onChange={(text) => handleFieldChange(field.id, text)}
                      />
                    </div>
                  )
                }

                if (type === 'SINGLE_SELECT' || type === 'SINGLE_CHOICE' || type === 'MULTI_SELECT') {
                  const optString = field.settings?.specific?.customOptions || 'Option 1,Option 2,Option 3'
                  const delimiter = field.settings?.specific?.separateOptionsUsing === 'COMMA' ? ',' : '\n'
                  const opts = optString
                    .split(delimiter)
                    .map((o: any) => o.trim())
                    .filter(Boolean)
                    .map((o: string) => ({ id: o, name: o }))

                  const selectedOpt = val ? { id: val, name: val } : null

                  return (
                    <div key={field.id}>
                      <InputSelect
                        label={field.label || 'Select Options'}
                        required={isFieldRequired}
                        description={field.settings?.general?.description}
                        placeholder={field.settings?.general?.placeholder || 'Select option'}
                        options={opts}
                        value={selectedOpt}
                        onChange={(opt) => handleFieldChange(field.id, opt ? opt.id : '')}
                      />
                    </div>
                  )
                }

                // Default fallback: text input
                return (
                  <div key={field.id}>
                    <InputText
                      label={field.label || 'Text'}
                      required={isFieldRequired}
                      placeholder={field.settings?.general?.placeholder || 'Type answer...'}
                      description={field.settings?.general?.description}
                      value={val}
                      onChange={(text) => handleFieldChange(field.id, text)}
                    />
                  </div>
                )
              })}

              {fields.length === 0 && (
                <div className='py-8 text-center text-xs text-gray-5 bg-gray-50 border border-dashed border-gray-3 rounded-2xl'>
                  This form currently has no input fields.
                </div>
              )}
            </div>

            {/* Sidebar Footer actions */}
            <div className='flex items-center justify-end gap-3 border-t border-gray-2 bg-gray-50/50 px-5 py-4 shrink-0'>
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
        )}
      </div>
    </div>
  )
}

FormEntriesPage.displayName = 'FormEntriesPage'
export default FormEntriesPage
