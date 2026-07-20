import { Divider, Rating, Skeleton, Stack, Tooltip } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Column } from '@/components/base/data-table/types'
import type { Question } from '@/pages/form-builder/store/formStore'
import formApi from '@/api/form/form'
import userApi from '@/api/user'
import authUserStore from '@/stores/authUserStore'
import Badge from '@/components/base/Badge'
import Modal from '@/components/base/Modal'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
// DataTable and pagination imports
import DataTable from '@/components/base/data-table/DataTable'
import useDataTable from '@/components/base/data-table/hooks/useDataTable'
import useDataTableState from '@/components/base/data-table/hooks/useDataTableState'
import TableSearch from '@/components/base/data-table/actions/TableSearch'
import TableExport from '@/components/base/data-table/actions/TableExport'
import CustomFilter from '@/components/common/CustomFilter'
import Icon from '@/components/base/icon/Icon'
import InputDate from '@/components/base/inputs/InputDate'
import InputNumber from '@/components/base/inputs/InputNumber'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputSwitch from '@/components/base/inputs/InputSwitch'
import InputText from '@/components/base/inputs/InputText'
import InputTextarea from '@/components/base/inputs/InputTextarea'
import Pagination from '@/components/base/pagination/Pagination'
import Tab from '@/components/base/tabs/Tab'
import Tabs from '@/components/base/tabs/Tabs'
import showToast from '@/components/base/toast/showToast'
import cn from '@/utils/cn'

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

  const activeFields =
    fields.length > 0
      ? fields
      : [
          { id: 'f1', label: 'Initial Value', type: 'SHORT_TEXT' } as Question,
          { id: 'f2', label: 'Status', type: 'SHORT_TEXT' } as Question,
        ]

  return Array.from({ length: count }).map((_, idx) => {
    const entryId = `Entry #${idx + 1}`
    const values: Record<string, any> = {}

    activeFields.forEach((field) => {
      const type = (field.type || 'SHORT_TEXT').toUpperCase()
      const label = (field.label || '').toLowerCase()

      if (type === 'EMAIL' || label.includes('email')) {
        values[field.id] = `respondent${idx + 1}@ezofis.com`
      } else if (
        type === 'PHONE_NUMBER' ||
        label.includes('phone') ||
        label.includes('mobile')
      ) {
        values[field.id] = `+1 555-010${idx + 1}`
      } else if (type === 'DATE' || label.includes('date')) {
        values[field.id] = `2026-06-0${idx + 1}`
      } else if (type === 'TIME' || label.includes('time')) {
        values[field.id] = `10:3${idx} AM`
      } else if (
        type === 'NUMBER' ||
        type === 'COUNTER' ||
        label.includes('age') ||
        label.includes('qty')
      ) {
        values[field.id] = Math.floor(Math.random() * 80) + 20
      } else if (
        type === 'CURRENCY_AMOUNT' ||
        label.includes('amount') ||
        label.includes('price')
      ) {
        values[field.id] = `$${(Math.random() * 400 + 100).toFixed(2)}`
      } else if (type === 'YES_NO_TOGGLE' || type === 'CONSENT') {
        values[field.id] = idx % 2 === 0 ? 'Yes' : 'No'
      } else if (type === 'RATING') {
        values[field.id] = '⭐'.repeat((idx % 3) + 3)
      } else {
        // Fallbacks for generic inputs
        if (label.includes('name')) {
          const names = [
            'Emma Watson',
            'James Smith',
            'Sophia Jones',
            'Michael Brown',
            'Olivia Taylor',
            'David Miller',
          ]
          values[field.id] = names[idx % names.length]
        } else if (label.includes('company')) {
          const companies = [
            'EZOFIS Corp',
            'Google LLC',
            'DeepMind Inc',
            'Acme Systems',
            'Globex Corp',
          ]
          values[field.id] = companies[idx % companies.length]
        } else if (label.includes('subject') || label.includes('issue')) {
          const issues = [
            'Billing query',
            'Access request',
            'Bug report',
            'Feature feedback',
            'General question',
          ]
          values[field.id] = issues[idx % issues.length]
        } else if (field.settings?.specific?.customOptions) {
          const optString = field.settings.specific.customOptions
          const delimiter =
            field.settings.specific.separateOptionsUsing === 'COMMA'
              ? ','
              : '\n'
          const opts = optString
            .split(delimiter)
            .map((o: any) => o.trim())
            .filter(Boolean)
          values[field.id] =
            opts.length > 0 ? opts[idx % opts.length] : `Option ${idx + 1}`
        } else {
          values[field.id] = `Sample ${field.label || 'Value'} ${idx + 1}`
        }
      }
    })

    return {
      createdAt: `2026-06-04T12:00:00.000Z`,
      createdBy: sampleUsers[idx % sampleUsers.length],
      id: entryId,
      isDeleted: false,
      values,
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
  const [deletingEntry, setDeletingEntry] = useState<{
    id: string
    type: 'trash' | 'permanent'
  } | null>(null)

  // Pagination states
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({})

  // Active line items for the modal table explorer
  const [activeLineItems, setActiveLineItems] = useState<{
    rowId: string
    colLabel: string
    data: any[]
  } | null>(null)

  // Fetch users list for Created By resolution
  const { data: usersData } = useQuery({
    queryKey: ['users', 'list'],
    queryFn: async () => {
      const { payload, error } = await userApi.getUserList()
      if (error) throw new Error(error)
      return payload || []
    },
  })

  // Helper to match createdBy user ID to user name or logged in user name
  const resolveUserName = (userId: string) => {
    if (usersData && Array.isArray(usersData)) {
      const user = usersData.find(
        (u: any) =>
          String(u.id) === String(userId) ||
          String(u.userId) === String(userId),
      )
      if (user) {
        const fullName =
          user.fullName ||
          user.name ||
          (user.firstName
            ? `${user.firstName} ${user.lastName || ''}`.trim()
            : '') ||
          user.loginName ||
          user.email
        if (fullName) return fullName
      }
    }

    const store = authUserStore.getState()
    const loggedInUser = store.session
    if (loggedInUser && String(loggedInUser.id) === String(userId)) {
      const fullName =
        loggedInUser.name ||
        `${loggedInUser.firstName} ${loggedInUser.lastName || ''}`.trim() ||
        loggedInUser.email
      if (fullName) return fullName
    }

    return userId
  }

  // Fetch form schema
  const {
    data: formData,
    isError,
    isLoading,
    refetch,
  } = useQuery({
    enabled: !!formId,
    queryKey: ['forms', 'detail', formId],
    queryFn: async () => {
      const { data, error } = await formApi.getFormDataById(formId)
      if (error) throw new Error(error)
      return data
    },
  })

  // Fetch form entries from backend API
  const {
    data: fetchedEntries,
    isError: isEntriesError,
    isLoading: isEntriesLoading,
    refetch: refetchEntries,
  } = useQuery({
    enabled: !!formId,
    queryKey: ['forms', 'entries', formId],
    queryFn: async () => {
      const { data, error } = await formApi.getFormEntries(formId)
      if (error) throw new Error(error)
      if (data && typeof data === 'object' && Array.isArray(data.entries)) {
        return data.entries
      }
      return Array.isArray(data) ? data : []
    },
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

  const fields = useMemo(
    () => panels.flatMap((p: any) => p.fields || []),
    [panels],
  )

  // Resolver helper to find human-readable names for nested keys inside table structures
  const getFieldLabel = useCallback(
    (key: string) => {
      const topField = fields.find((item: Question) => item.id === key)
      if (topField) return topField.label || key

      for (const field of fields) {
        const tableCols =
          field.settings?.specific?.tableColumns ||
          field.settings?.specific?.columns
        if (Array.isArray(tableCols)) {
          const matchedCol = tableCols.find((col: any) => col.id === key)
          if (matchedCol) return matchedCol.name || matchedCol.label || key
        }
      }

      return key
    },
    [fields],
  )

  // Set up standard data table state
  const {
    expandState,
    groupState,
    searchState,
    sortState,
    visibilityState,
    setExpandState,
    setSearchState,
    setVisibilityState,
    ...restState
  } = useDataTableState({
    initialVisibilityState: {},
  })

  // Initialize selected columns (all columns visible by default)
  const [initialVisibilitySet, setInitialVisibilitySet] = useState(false)
  useEffect(() => {
    if (fields.length > 0 && !initialVisibilitySet) {
      const visibility: Record<string, boolean> = {}
      fields.forEach((field: Question) => {
        visibility[field.id] = true
      })
      setVisibilityState(visibility)
      setInitialVisibilitySet(true)
    }
  }, [fields, initialVisibilitySet, setVisibilityState])

  // Synchronize fetched entries from backend with component state
  useEffect(() => {
    if (fetchedEntries && Array.isArray(fetchedEntries)) {
      const parsedEntries = fetchedEntries.map((e: any) => {
        const metadataKeys = [
          'itemId',
          'id',
          'uid',
          'createdAt',
          'modifiedAt',
          'createdBy',
          'modifiedBy',
          'isDeleted',
          'todayTask',
          'isMarked',
          'ValidFrom',
          'ValidTo',
        ]
        // Extract flat dynamic field values from API item root into values object
        let values: Record<string, any> = {}
        if (e.values) {
          if (typeof e.values === 'string') {
            try {
              values = JSON.parse(e.values)
            } catch (err) {
              console.error('Failed to parse entry values:', err)
            }
          } else {
            values = e.values
          }
        } else {
          Object.keys(e).forEach((key) => {
            if (!metadataKeys.includes(key)) {
              values[key] = e[key]
            }
          })
        }

        return {
          id: e.itemId ? `Entry #${e.itemId}` : e.id || e.uid || `Entry #${Math.random()}`,
          createdAt: e.createdAt || new Date().toISOString(),
          createdBy: e.createdBy || 'unknown@ezofis.com',
          isDeleted: !!e.isDeleted,
          values,
        }
      })

      const active = parsedEntries.filter((e: any) => !e.isDeleted)
      const trashed = parsedEntries.filter((e: any) => e.isDeleted)
      setEntries(active)
      setTrashEntries(trashed)
    }
  }, [fetchedEntries])

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
        createdAt: new Date().toISOString(),
        createdBy: 'seth@ezofis.com',
        id: `Entry #${entries.length + trashEntries.length + 1}`,
        isDeleted: false,
        values: editValues,
      }
      setEntries((prev) => [newEntry, ...prev])
      showToast({ message: 'Entry created successfully!', variant: 'success' })
    } else if (selectedEntry) {
      setEntries((prev) =>
        prev.map((e) =>
          e.id === selectedEntry.id ? { ...e, values: editValues } : e,
        ),
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
    let list = activeList
    
    // Apply Custom Filters
    list = list.filter((entry) => {
      let matches = true
      Object.entries(activeFilters).forEach(([key, value]) => {
        if (!value) return
        if (key === 'createdAt' || key === 'modifiedAt') {
          const filterDate = value.split('T')[0]
          const rowDate = entry[key] ? String(entry[key]).split('T')[0] : ''
          if (rowDate !== filterDate) matches = false
        } else if (key === 'createdBy' || key === 'modifiedBy') {
          if (entry[key] !== value) matches = false
        } else {
          // For dynamic fields in 'values' or other top level strings
          const entryVal = entry[key] || entry.values?.[key]
          if (!entryVal || !String(entryVal).toLowerCase().includes(String(value).toLowerCase())) {
            matches = false
          }
        }
      })
      return matches
    })

    if (!searchVal.trim()) return list
    const q = searchVal.toLowerCase()
    
    return list.filter((entry) => {
      if (entry.id.toLowerCase().includes(q)) return true
      const resolvedUserName = resolveUserName(entry.createdBy).toLowerCase()
      if (resolvedUserName.includes(q)) return true
      return Object.values(entry.values).some((v) =>
        String(v).toLowerCase().includes(q),
      )
    })
  }, [activeList, searchVal, activeFilters])

  // Sorting
  const sortedAndFilteredEntries = useMemo(() => {
    const list = [...filteredEntries]
    if (sortState && sortState.length > 0) {
      const { desc, id } = sortState[0]
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
          return desc
            ? Number(valB) - Number(valA)
            : Number(valA) - Number(valB)
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
      const isStatusCol = (field.label || '').toLowerCase().trim() === 'matched status'
      const getFieldLabel = (key: string) => {
        const f = fields.find((item: Question) => item.id === key)
        return f?.label || key
      }

      colList.push({
        id: field.id,
        label: field.label || 'Untitled Field',
        size: 180,
        renderCell: (row: any) => {
          const val = row.values?.[field.id]
          
          // 1. Handle matched status badge
          if (isStatusCol && val) {
            const statusStr = String(val).trim()
            let badgeColor: 'green' | 'red' | 'orange' | 'gray' = 'gray'
            const lowerStatus = statusStr.toLowerCase()
            if (lowerStatus.includes('partially matched') || lowerStatus.includes('partial')) {
              badgeColor = 'orange' // yellow/orange
            } else if (lowerStatus.includes('not matched') || lowerStatus.includes('mismatch') || lowerStatus.includes('fail') || lowerStatus.includes('error')) {
              badgeColor = 'red'
            } else if (lowerStatus.includes('matched') || lowerStatus === 'match') {
              badgeColor = 'green'
            }
            return <Badge color={badgeColor} label={statusStr} />
          }

          // 2. Handle nested PO line items table inline expansion
          const isJsonTable = (() => {
            if (typeof val !== 'string') return false
            const trimmed = val.trim()
            return trimmed.startsWith('[') && trimmed.endsWith(']')
          })()

          if (isJsonTable) {
            let parsedData: any[] = []
            try {
              parsedData = JSON.parse(String(val))
            } catch (e) {
              console.error('Failed to parse nested table JSON', e)
            }

            return (
              <div className='flex items-center gap-2'>
                <IconButton
                  color='primary'
                  icon='lucide:table'
                  title='View Line Items Table'
                  variant='ghost'
                  onClick={() =>
                    setActiveLineItems({
                      rowId: row.id,
                      colLabel: field.label || 'Line Items',
                      data: parsedData,
                    })
                  }
                />
                <span className='text-[10px] font-semibold text-gray-7'>
                  ({parsedData.length} items)
                </span>
              </div>
            )
          }

          return (
            <span className='block max-w-[200px] truncate font-medium text-[var(--gray-12)]'>
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
          renderCell: () => (
            <span className='text-[var(--gray-6)] italic'>
              Empty form field
            </span>
          ),
        },
        {
          id: 'empty-2',
          label: 'Placeholder Column 2',
          size: 180,
          renderCell: () => (
            <span className='text-[var(--gray-6)] italic'>
              Empty form field
            </span>
          ),
        },
      )
    }

    colList.push(
      {
        id: 'createdBy',
        label: 'Created By',
        size: 180,
        renderCell: (row: any) => (
          <span className='font-medium text-[var(--gray-12)]'>
            {resolveUserName(row.createdBy)}
          </span>
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
          <div
            className='flex items-center justify-end gap-1.5'
            onClick={(e) => e.stopPropagation()}
          >
            {tabValue === 'Browse' ? (
              <>
                <Tooltip label='Edit Entry'>
                  <IconButton
                    color='gray'
                    icon='lucide:pencil'
                    variant='ghost'
                    onClick={() => openEditEntry(row)}
                  />
                </Tooltip>
                <Tooltip label='Move to Trash'>
                  <IconButton
                    color='red'
                    icon='lucide:trash-2'
                    variant='ghost'
                    onClick={() =>
                      setDeletingEntry({ id: row.id, type: 'trash' })
                    }
                  />
                </Tooltip>
              </>
            ) : (
              <>
                <Tooltip label='Restore Entry'>
                  <IconButton
                    color='green'
                    icon='lucide:rotate-ccw'
                    variant='ghost'
                    onClick={() => handleRestore(row.id)}
                  />
                </Tooltip>
                <Tooltip label='Permanent Delete'>
                  <IconButton
                    color='red'
                    icon='lucide:trash-2'
                    variant='ghost'
                    onClick={() =>
                      setDeletingEntry({ id: row.id, type: 'permanent' })
                    }
                  />
                </Tooltip>
              </>
            )}
          </div>
        ),
      },
    )

    return colList
  }, [fields, tabValue, activeLineItems, usersData])

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
      setSearchState,
      setVisibilityState,
      ...restState,
    },
  })

  const isPageLoading = isLoading || isEntriesLoading
  const isPageError = isError || isEntriesError

  const createdByOptions = useMemo(() => {
    const unique = new Map<string, string>()
    entries.forEach((e: any) => {
      if (e.createdBy) unique.set(e.createdBy, resolveUserName(e.createdBy))
    })
    return Array.from(unique.entries()).map(([value, label]) => ({ label, value }))
  }, [entries, usersData])

  const dynamicFilters = useMemo(() => {
    return fields.map((field) => {
      const unique = new Set<string>()
      entries.forEach((e) => {
        const val = e.values?.[field.id]
        // Skip JSON arrays for dropdown options
        if (val && !(typeof val === 'string' && val.trim().startsWith('['))) {
          unique.add(String(val))
        }
      })
      const options = Array.from(unique).map((val) => ({ label: val, value: val }))
      
      if (options.length === 0) return null
      
      return {
        id: field.id,
        label: field.label || field.id,
        options,
      }
    }).filter(Boolean) as any[]
  }, [fields, entries])

  // Skeleton Loader for initial fetching
  if (isPageLoading) {
    return (
      <div className='bg-gray-50/20 flex h-full flex-col p-8'>
        <div className='mb-6 flex items-center justify-between border-b border-gray-2 pb-4'>
          <Stack gap='xs'>
            <Skeleton height={14} width={120} />
            <Skeleton height={28} width={240} />
          </Stack>
          <Skeleton height={40} radius='md' width={130} />
        </div>
        <Skeleton className='mb-4' height={45} radius='md' />
        <Skeleton className='flex-1' height={300} radius='md' />
      </div>
    )
  }

  if (isPageError) {
    return (
      <div className='bg-gray-50/20 flex h-full flex-col items-center justify-center p-8'>
        <div className='mb-4 flex size-14 items-center justify-center rounded-2xl border border-red-3 bg-red-2 text-red-11'>
          <Icon className='size-7 animate-bounce' name='lucide:alert-circle' />
        </div>
        <h3 className='text-lg font-bold text-gray-12'>Failed to load form</h3>
        <p className='mt-1 max-w-[280px] text-center text-xs text-gray-7'>
          The form may have been deleted, or there was a database networking
          error.
        </p>
        <Button
          className='mt-6'
          icon='lucide:rotate-cw'
          label='Retry Loading'
          onClick={() => {
            refetch()
            refetchEntries()
          }}
        />
      </div>
    )
  }

  const isPanelOpen = isAddOpen || !!selectedEntry

  if (isPanelOpen) {
    return (
      <div className='bg-gray-50/10 flex h-full flex-col font-inter'>
        {/* Form Header */}
        <div className='flex shrink-0 items-center justify-between border-b border-gray-2 bg-white px-6 py-4'>
          <div className='flex min-w-0 items-center gap-3'>
            <IconButton
              color='gray'
              icon='lucide:arrow-left'
              title='Back to Entries'
              variant='ghost'
              onClick={closeSidebar}
            />
            <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft/10 text-accent-primary'>
              <Icon
                height={18}
                name={isAddOpen ? 'lucide:file-plus-2' : 'lucide:file-edit'}
                width={18}
              />
            </div>
            <div className='flex min-w-0 flex-col'>
              <h3 className='truncate text-[14px] font-extrabold text-gray-13'>
                {isAddOpen ? 'New Form Entry' : selectedEntry?.id}
              </h3>
              <p className='truncate text-[10px] font-semibold tracking-wider text-gray-7 uppercase'>
                {isAddOpen
                  ? 'Submit answers to form'
                  : 'Modify submitted answers'}
              </p>
            </div>
          </div>
          <div className='flex items-center gap-3'>
            <Button
              color='gray'
              label='Cancel'
              variant='outline'
              onClick={closeSidebar}
            />
            <Button
              color='primary'
              icon='lucide:save'
              label={isAddOpen ? 'Submit' : 'Save Changes'}
              variant='solid'
              onClick={handleSaveEntry}
            />
          </div>
        </div>

        {/* Scrollable Form Body (similar to Form Builder style) */}
        <div className='custom-scrollbar flex-1 overflow-y-auto bg-[var(--gray-2)]/30 px-6 py-8'>
          <div className='mx-auto w-full max-w-[800px] space-y-6 rounded-2xl border border-[var(--gray-3)] bg-white p-8 shadow-md'>
            {fields.map((field: Question) => {
              const type = (field.type || 'SHORT_TEXT').toUpperCase()
              const val = editValues[field.id] ?? ''
              const isFieldRequired =
                field.settings?.validation?.fieldRule === 'REQUIRED'

              return (
                <div
                  className='border-b border-gray-1 pb-6 last:border-0 last:pb-0'
                  key={field.id}
                >
                  {/* Handle divider / heading types specially (no labels/inputs needed) */}
                  {type === 'DIVIDER' ? (
                    <Divider className='my-4' />
                  ) : type === 'HEADING' ? (
                    <h3 className='text-lg font-bold text-gray-13'>
                      {field.label || 'Heading Section'}
                    </h3>
                  ) : (
                    <>
                      {/* Label / Description wrapper */}
                      <div className='mb-2'>
                        <label className='block text-sm font-bold text-gray-12'>
                          {field.label || 'Untitled Question'}
                          {isFieldRequired && (
                            <span className='ml-1 text-red-9'>*</span>
                          )}
                        </label>
                        {field.settings?.general?.description && (
                          <span className='mt-0.5 block text-xs text-gray-7'>
                            {field.settings.general.description}
                          </span>
                        )}
                      </div>

                      {/* Render matching dynamic form control */}
                      {type === 'YES_NO_TOGGLE' || type === 'CONSENT' ? (
                        <div className='bg-gray-50/50 flex max-w-xs items-center justify-between rounded-xl border border-gray-2 p-3 transition-colors hover:border-gray-3'>
                          <span className='text-xs font-semibold text-gray-11'>
                            Consent / Enable
                          </span>
                          <InputSwitch
                            checked={val === 'Yes'}
                            onChange={(checked) =>
                              handleFieldChange(
                                field.id,
                                checked ? 'Yes' : 'No',
                              )
                            }
                          />
                        </div>
                      ) : type === 'DATE' ? (
                        <InputDate
                          value={val ? val : null}
                          placeholder={
                            field.settings?.general?.placeholder ||
                            'Select Date'
                          }
                          onChange={(dateString) =>
                            handleFieldChange(field.id, dateString)
                          }
                        />
                      ) : type === 'NUMBER' || type === 'COUNTER' ? (
                        <InputNumber
                          value={val}
                          placeholder={
                            field.settings?.general?.placeholder ||
                            'Enter value'
                          }
                          onChange={(num) => handleFieldChange(field.id, num)}
                        />
                      ) : type === 'CURRENCY_AMOUNT' ? (
                        <div className='relative max-w-xs'>
                          <span className='absolute top-1/2 left-3 -translate-y-1/2 text-sm font-bold text-gray-8'>
                            $
                          </span>
                          <InputNumber
                            value={val}
                            classNames={{
                              input: 'pl-8',
                            }}
                            placeholder={
                              field.settings?.general?.placeholder || '0.00'
                            }
                            onChange={(num) => handleFieldChange(field.id, num)}
                          />
                        </div>
                      ) : type === 'RATING' ? (
                        <div className='py-2'>
                          <Rating
                            color='yellow'
                            count={field.settings?.specific?.iconCount || 5}
                            size='lg'
                            value={Number(val || 0)}
                            onChange={(v) => handleFieldChange(field.id, v)}
                          />
                        </div>
                      ) : type === 'OPINION_SCALE' ? (
                        <div className='flex flex-wrap gap-1 py-1'>
                          {Array.from({ length: 11 }).map((_, i) => {
                            const isSelected = Number(val) === i && val !== ''
                            return (
                              <button
                                key={i}
                                type='button'
                                className={cn(
                                  'size-10 rounded-lg border text-sm font-bold transition-all hover:bg-accent-soft hover:text-accent-primary active:scale-95',
                                  isSelected
                                    ? 'border-accent-primary bg-accent-primary text-white'
                                    : 'border-gray-3 bg-white text-gray-12',
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
                          const optString =
                            field.settings?.specific?.customOptions ||
                            'Option A,Option B,Option C'
                          const delimiter =
                            field.settings?.specific?.separateOptionsUsing ===
                            'COMMA'
                              ? ','
                              : '\n'
                          const opts = optString
                            .split(delimiter)
                            .map((o: any) => o.trim())
                            .filter(Boolean)

                          return (
                            <div className='max-w-md space-y-2'>
                              {opts.map((opt: string) => {
                                const isSelected = val === opt
                                return (
                                  <button
                                    key={opt}
                                    type='button'
                                    className={cn(
                                      'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all hover:bg-gray-1 active:scale-[0.99]',
                                      isSelected
                                        ? 'border-accent-primary bg-accent-soft/10 font-bold text-accent-primary'
                                        : 'border-gray-2 bg-white text-gray-12',
                                    )}
                                    onClick={() =>
                                      handleFieldChange(field.id, opt)
                                    }
                                  >
                                    <div className='flex size-5 shrink-0 items-center justify-center rounded-full border border-gray-3'>
                                      {isSelected && (
                                        <div className='size-2.5 rounded-full bg-accent-primary' />
                                      )}
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
                          const optString =
                            field.settings?.specific?.customOptions ||
                            'Option A,Option B,Option C'
                          const delimiter =
                            field.settings?.specific?.separateOptionsUsing ===
                            'COMMA'
                              ? ','
                              : '\n'
                          const opts = optString
                            .split(delimiter)
                            .map((o: any) => o.trim())
                            .filter(Boolean)

                          const selectedList = Array.isArray(val)
                            ? val
                            : val
                              ? String(val).split(',')
                              : []

                          const toggleOpt = (opt: string) => {
                            const next = selectedList.includes(opt)
                              ? selectedList.filter((x) => x !== opt)
                              : [...selectedList, opt]
                            handleFieldChange(field.id, next.join(','))
                          }

                          return (
                            <div className='max-w-md space-y-2'>
                              {opts.map((opt: string) => {
                                const isSelected = selectedList.includes(opt)
                                return (
                                  <button
                                    key={opt}
                                    type='button'
                                    className={cn(
                                      'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all hover:bg-gray-1 active:scale-[0.99]',
                                      isSelected
                                        ? 'border-accent-primary bg-accent-soft/10 font-bold text-accent-primary'
                                        : 'border-gray-2 bg-white text-gray-12',
                                    )}
                                    onClick={() => toggleOpt(opt)}
                                  >
                                    <div className='flex size-5 shrink-0 items-center justify-center rounded-md border border-gray-3'>
                                      {isSelected && (
                                        <Icon
                                          className='size-3.5 text-accent-primary'
                                          name='lucide:check'
                                        />
                                      )}
                                    </div>
                                    <span className='text-sm'>{opt}</span>
                                  </button>
                                )
                              })}
                            </div>
                          )
                        })()
                      ) : type === 'SINGLE_SELECT' ||
                        type === 'MULTI_SELECT' ? (
                        (() => {
                          const optString =
                            field.settings?.specific?.customOptions ||
                            'Option A,Option B,Option C'
                          const delimiter =
                            field.settings?.specific?.separateOptionsUsing ===
                            'COMMA'
                              ? ','
                              : '\n'
                          const opts = optString
                            .split(delimiter)
                            .map((o: any) => o.trim())
                            .filter(Boolean)
                            .map((o: string) => ({ id: o, name: o }))

                          const selectedOpt = val
                            ? { id: val, name: val }
                            : null

                          return (
                            <InputSelect
                              options={opts}
                              value={selectedOpt}
                              placeholder={
                                field.settings?.general?.placeholder ||
                                'Select option'
                              }
                              onChange={(opt) =>
                                handleFieldChange(field.id, opt ? opt.id : '')
                              }
                            />
                          )
                        })()
                      ) : type === 'FILE_UPLOAD' || type === 'IMAGE_UPLOAD' ? (
                        <div className='bg-gray-50 flex max-w-md items-center justify-between rounded-xl border border-gray-2 p-3'>
                          <div className='flex items-center gap-2'>
                            <Icon
                              className='size-5 text-gray-8'
                              name='lucide:upload-cloud'
                            />
                            <span className='text-xs font-semibold text-gray-11'>
                              Upload dynamic documents / media
                            </span>
                          </div>
                          <IconButton
                            color='gray'
                            icon='lucide:upload'
                            variant='outline'
                            onClick={() =>
                              showToast({
                                message: 'File picker simulated successfully',
                              })
                            }
                          />
                        </div>
                      ) : type === 'LONG_TEXT' ? (
                        <InputTextarea
                          value={val}
                          placeholder={
                            field.settings?.general?.placeholder ||
                            'Write here...'
                          }
                          onChange={(text) => handleFieldChange(field.id, text)}
                        />
                      ) : (
                        <InputText
                          value={val}
                          placeholder={
                            field.settings?.general?.placeholder ||
                            'Type answer...'
                          }
                          onChange={(text) => handleFieldChange(field.id, text)}
                        />
                      )}
                    </>
                  )}
                </div>
              )
            })}

            {fields.length === 0 && (
              <div className='bg-gray-50 rounded-2xl border border-dashed border-gray-3 py-12 text-center text-xs text-gray-5'>
                This form currently has no input fields.
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }


  return (
    <div className='flex h-full flex-col bg-white'>
      {/* 1. HEADER (Title, Back button, Browse/Trash Tabs) */}
      <div className='flex items-center justify-between border-b border-gray-2 px-6 py-4'>
        <div className='flex items-center gap-4'>
          <IconButton
            color='gray'
            icon='lucide:arrow-left'
            title='Back to Forms'
            variant='ghost'
            onClick={() => navigate({ to: '/forms' })}
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
          icon='lucide:plus'
          label='Add Entry'
          variant='solid'
          onClick={openNewEntry}
        />
      </div>

      {deletingEntry && (
        <div className='animate-in fade-in slide-in-from-top-4 mx-6 mt-4 flex items-center justify-between gap-4 rounded-xl border border-red-3 bg-red-2 p-4 text-red-11 shadow-sm duration-300'>
          <div className='flex items-center gap-3'>
            <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-3 text-red-11'>
              <Icon
                className='h-5 w-5 animate-pulse text-red-11'
                name='lucide:triangle-alert'
              />
            </div>
            <div>
              <h4 className='text-sm font-semibold text-red-12'>
                {deletingEntry.type === 'trash'
                  ? 'Move Entry to Trash'
                  : 'Permanently Delete Entry'}
              </h4>
              <p className='mt-0.5 text-xs text-red-11'>
                {deletingEntry.type === 'trash' ? (
                  <>
                    Are you sure you want to move{' '}
                    <span className='font-bold text-red-12'>
                      {deletingEntry.id}
                    </span>{' '}
                    to Trash?
                  </>
                ) : (
                  <>
                    Are you sure you want to permanently delete{' '}
                    <span className='font-bold text-red-12'>
                      {deletingEntry.id}
                    </span>
                    ? This action is permanent and cannot be undone.
                  </>
                )}
              </p>
            </div>
          </div>
          <div className='flex shrink-0 items-center gap-2'>
            <Button
              color='gray'
              size='sm'
              variant='subtle'
              onClick={() => setDeletingEntry(null)}
            >
              Cancel
            </Button>
            <Button
              color='red'
              icon='lucide:trash-2'
              size='sm'
              variant='solid'
              onClick={() => {
                if (deletingEntry.type === 'trash') {
                  handleMoveToTrash(deletingEntry.id)
                } else {
                  handlePermanentDelete(deletingEntry.id)
                }
                setDeletingEntry(null)
              }}
            >
              {deletingEntry.type === 'trash'
                ? 'Move to Trash'
                : 'Delete Permanently'}
            </Button>
          </div>
        </div>
      )}

      {/* 2. MAIN LAYOUT (Table view) */}
      <div className='relative flex flex-1 overflow-hidden'>
        <div className='bg-gray-50/50 flex flex-1 flex-col overflow-hidden p-6'>
          <CustomFilter
            filters={[
              {
                id: "createdBy",
                label: "Created By",
                options: createdByOptions,
              }
            ]}
            moreFilters={[
              {
                id: "createdAt",
                label: "Created Date",
                dataType: "date",
              },
              ...dynamicFilters,
            ]}
            activeFilters={activeFilters}
            onFilterChange={(id, value) => {
              setActiveFilters((prev) => ({ ...prev, [id]: value }))
              setPage(1)
            }}
            onReset={() => {
              setActiveFilters({})
              setSearchState({ id: '', value: '' })
              setPage(1)
            }}
            showReset={Object.keys(activeFilters).some(k => activeFilters[k]) || !!searchState?.value}
            searchQuery=""
            onSearchChange={() => {}}
            searchPlaceholder="Search entries..."
            customSearchComponent={<TableSearch table={table as any} />}
            actionButtons={[
              {
                id: 'refresh',
                icon: 'tabler:refresh',
                tooltip: 'Refresh',
                onClick: () => {
                  refetch()
                  refetchEntries()
                },
                isIconButton: true,
                color: 'gray',
                variant: 'outline',
                disabled: isPageLoading
              }
            ]}
            trailingActions={
              <TableExport table={table as any} />
            }
          />
          <div className='min-h-0 flex-1 mt-2 overflow-hidden'>
            <DataTable
              actions={[]}
              hideActionBar={true}
              hideGrouping={true}
              hideExport={true}
              hideReload={true}
              hideSearch={true}
              hideFilters={true}
              isLoading={isPageLoading}
              isReLoading={isPageLoading}
              pageSize={pageSize}
              stickyHeader={true}
              table={table}
              onReload={() => {
                refetch()
                refetchEntries()
              }}
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

      {/* Dynamic Modal popup for nested table data */}
      <Modal
        opened={!!activeLineItems}
        width={700}
        onClose={() => setActiveLineItems(null)}
      >
        {activeLineItems && (
          <div className='flex flex-col font-inter p-6 bg-white rounded-lg'>
            <div className='flex items-center justify-between mb-4 pb-2 border-b border-gray-2'>
              <div className='flex items-center gap-2'>
                <Icon name='lucide:table' className='size-5 text-accent-primary' />
                <h3 className='text-sm font-bold text-gray-13'>
                  {activeLineItems.colLabel} — {activeLineItems.rowId}
                </h3>
              </div>
              <IconButton
                color='gray'
                icon='lucide:x'
                size='sm'
                variant='ghost'
                onClick={() => setActiveLineItems(null)}
              />
            </div>
            
            <div className='max-h-[400px] overflow-y-auto overflow-x-auto border border-gray-2 rounded-lg bg-white custom-scrollbar'>
              <table className='w-full text-left text-xs border-collapse'>
                <thead>
                  <tr className='border-b border-gray-2 bg-gray-50'>
                    {activeLineItems.data.length > 0 &&
                      Object.keys(activeLineItems.data[0]).map((k) => (
                        <th
                          key={k}
                          className='p-3 font-bold text-gray-11 whitespace-nowrap'
                        >
                          {getFieldLabel(k)}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {activeLineItems.data.map((item: any, idx: number) => (
                    <tr
                      key={idx}
                      className='border-b border-gray-1 last:border-0 hover:bg-gray-50/50'
                    >
                      {Object.keys(item).map((k) => (
                        <td
                          key={k}
                          className='p-3 font-medium text-gray-12 whitespace-nowrap'
                        >
                          {item[k]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

FormEntriesPage.displayName = 'FormEntriesPage'
export default FormEntriesPage
