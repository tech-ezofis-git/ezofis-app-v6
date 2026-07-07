import type { DragEndEvent } from '@dnd-kit/core'
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { createColumnHelper, useReactTable } from '@tanstack/react-table'
import {
  Check,
  ChevronRight,
  Cloud,
  Database,
  Folder,
  GripVertical,
  HardDrive,
  Link2,
  Plus,
  RefreshCw,
} from 'lucide-react'
import {
  type Dispatch,
  type ElementType,
  type SetStateAction,
  useMemo,
  useState,
} from 'react'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import DataTable from '@/components/base/data-table/DataTable'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputSwitch from '@/components/base/inputs/InputSwitch'
import InputText from '@/components/base/inputs/InputText'
import InputTextarea from '@/components/base/inputs/InputTextarea'
import {
  settingsHeaderMeta,
  settingsTableCoreOptions,
} from '../../helpers/settingsDataTable'
import SettingsSearchInput from '../SettingsSearchInput'
import SettingsSortableDataTable from '../SettingsSortableDataTable'

type DmsFolderConfigurationProps = {
  onBack?: () => void
}
type FieldRow = {
  fieldName: string
  id: string
  mandatory: boolean
  ocrExtract: boolean
  searchable: boolean
  showInList: boolean
  syncField: boolean
  system?: boolean
  type: string
}

type RepositoryRow = {
  category: string
  documents: number
  id: number
  name: string
  owner: string
  status: RepositoryStatus
  storage: string
  versioning: string
}

type RepositoryStatus = 'active' | 'archived'

type SelectOption = {
  description?: string
  disabled?: boolean
  id: string | number
  name: string
  value?: string
}

type WizardStep = 1 | 2 | 3 | 4 | 5

type WizardStepItem = {
  description: string
  id: WizardStep
  title: string
}

const repositories: RepositoryRow[] = [
  {
    category: 'Invoices',
    documents: 1250,
    id: 1,
    name: 'AP Invoices',
    owner: 'John Smith',
    status: 'active',
    storage: 'Default',
    versioning: 'Incremental Versioning',
  },
  {
    category: 'Purchase Orders',
    documents: 840,
    id: 2,
    name: 'Purchase Orders',
    owner: 'Sarah Miller',
    status: 'active',
    storage: 'Azure',
    versioning: 'Timestamp Versioning',
  },
  {
    category: 'Contracts',
    documents: 320,
    id: 3,
    name: 'Vendor Contracts',
    owner: 'Mike Johnson',
    status: 'active',
    storage: 'OneDrive',
    versioning: 'Incremental Versioning',
  },
  {
    category: 'Compliance',
    documents: 2195,
    id: 4,
    name: 'Compliance Docs',
    owner: 'Lisa Chen',
    status: 'active',
    storage: 'Default',
    versioning: 'Replace Existing',
  },
  {
    category: 'Receipts',
    documents: 0,
    id: 5,
    name: 'Old Receipts',
    owner: 'Tom Wilson',
    status: 'archived',
    storage: 'Default',
    versioning: 'Incremental Versioning',
  },
]

const defaultFields: FieldRow[] = [
  {
    fieldName: 'Invoice Number',
    id: 'invoiceNumber',
    mandatory: true,
    ocrExtract: true,
    searchable: true,
    showInList: true,
    syncField: true,
    system: true,
    type: 'Text',
  },
  {
    fieldName: 'Vendor Name',
    id: 'vendorName',
    mandatory: true,
    ocrExtract: true,
    searchable: true,
    showInList: true,
    syncField: false,
    system: true,
    type: 'Text',
  },
  {
    fieldName: 'Invoice Date',
    id: 'invoiceDate',
    mandatory: true,
    ocrExtract: true,
    searchable: true,
    showInList: true,
    syncField: false,
    system: true,
    type: 'Date',
  },
  {
    fieldName: 'PO Number',
    id: 'poNumber',
    mandatory: false,
    ocrExtract: true,
    searchable: true,
    showInList: true,
    syncField: true,
    system: true,
    type: 'Text',
  },
  {
    fieldName: 'Amount',
    id: 'amount',
    mandatory: true,
    ocrExtract: true,
    searchable: false,
    showInList: true,
    syncField: true,
    system: true,
    type: 'Currency',
  },
]

const wizardSteps: WizardStepItem[] = [
  { description: 'Name, owner and category', id: 1, title: 'Folder Details' },
  { description: 'Select storage provider', id: 2, title: 'Storage' },
  { description: 'Configure metadata fields', id: 3, title: 'Fields' },
  { description: 'File version strategy', id: 4, title: 'Versioning' },
  { description: 'ERP and sync mapping', id: 5, title: 'Integrations' },
]

const categoryOptions: SelectOption[] = [
  { id: 'General', name: 'General', value: 'General' },
  { id: 'Invoices', name: 'Invoices', value: 'Invoices' },
  { id: 'Contracts', name: 'Contracts', value: 'Contracts' },
]

const storageOptions = [
  {
    icon: HardDrive,
    id: 'Default Drive',
    subtitle: 'Built-in secure storage',
    title: 'Default Drive',
  },
  {
    icon: Cloud,
    id: 'Azure Blob Storage',
    subtitle: 'Microsoft Azure cloud',
    title: 'Azure Blob Storage',
  },
  {
    icon: Cloud,
    id: 'OneDrive',
    subtitle: 'Microsoft OneDrive',
    title: 'OneDrive',
  },
  {
    icon: Cloud,
    id: 'Google Drive',
    subtitle: 'Google Workspace',
    title: 'Google Drive',
  },
  {
    icon: Database,
    id: 'Amazon S3',
    subtitle: 'AWS S3 bucket',
    title: 'Amazon S3',
  },
]

const versionOptions = [
  {
    id: 'Replace Existing',
    sample: 'Invoice.pdf → Invoice.pdf',
    subtitle: 'New uploads replace the existing file',
    title: 'Replace Existing',
  },
  {
    id: 'Timestamp Version',
    sample: 'Invoice.pdf → Invoice_20260101_1000.pdf',
    subtitle: 'Append timestamp to each version',
    title: 'Timestamp Version',
  },
  {
    id: 'Incremental Version',
    sample: 'Invoice.pdf → Invoice_1.pdf → Invoice_2.pdf',
    subtitle: 'Auto-increment version number',
    title: 'Incremental Version',
  },
]

const integrations = [
  'SAP',
  'Oracle ERP',
  'Microsoft Dynamics',
  'QuickBooks',
  'Custom API',
]
const defaultHierarchy = ['Root', 'Year', 'Month', 'Vendor']

const fieldColumnHelper = createColumnHelper<FieldRow>()

const toggleFieldKeys = [
  'mandatory',
  'searchable',
  'showInList',
  'ocrExtract',
  'syncField',
] as const satisfies ReadonlyArray<keyof FieldRow>

type ToggleFieldKey = (typeof toggleFieldKeys)[number]

const toggleFieldLabels: Record<ToggleFieldKey, string> = {
  mandatory: 'Mandatory',
  ocrExtract: 'OCR Extract',
  searchable: 'Searchable',
  showInList: 'Show in List',
  syncField: 'Sync Field',
}

const fieldTypeOptions: SelectOption[] = [
  { id: 'Alphanumeric', name: 'Alphanumeric', value: 'Alphanumeric' },
  { id: 'Date', name: 'Date', value: 'Date' },
  { id: 'Currency', name: 'Currency', value: 'Currency' },
  { id: 'Text', name: 'Text', value: 'Text' },
]

type SortableHierarchyItemProps = {
  item: string
}

export default function DmsFolderConfiguration({
  onBack,
}: DmsFolderConfigurationProps) {
  const [search, setSearch] = useState('')
  const [showWizard, setShowWizard] = useState(false)
  const [step, setStep] = useState<WizardStep>(1)
  const [fields, setFields] = useState<FieldRow[]>(defaultFields)
  const [folderHierarchy, setFolderHierarchy] =
    useState<string[]>(defaultHierarchy)
  const [storage, setStorage] = useState('Default Drive')
  const [versioning, setVersioning] = useState('Incremental Version')
  const [displayMode, setDisplayMode] = useState('Show Latest Version Only')
  const [folderName, setFolderName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<SelectOption>(categoryOptions[0])
  const [folderOwner, setFolderOwner] = useState('')
  const [folderCoordinator, setFolderCoordinator] = useState('')

  const filteredRepositories = useMemo(() => {
    const value = search.trim().toLowerCase()
    if (!value) return repositories

    return repositories.filter((repo) =>
      `${repo.name} ${repo.owner} ${repo.category} ${repo.storage}`
        .toLowerCase()
        .includes(value),
    )
  }, [search])

  const goNext = () => setStep((prev) => Math.min(5, prev + 1) as WizardStep)
  const goBack = () => setStep((prev) => Math.max(1, prev - 1) as WizardStep)

  const closeWizard = () => {
    setShowWizard(false)
    setStep(1)
  }

  const handleCreateRepository = () => {
    const payload = {
      category: category.name,
      description,
      displayMode,
      fields,
      folderCoordinator,
      folderHierarchy,
      folderName,
      folderOwner,
      storage,
      versioning,
    }

    console.log('Repository payload:', payload)
    closeWizard()
  }

  return (
    <div className='min-h-[90vh] bg-[var(--surface)]'>
      <div className='flex items-center justify-between gap-6 border-b border-gray-3 bg-[var(--surface)] bg-surface px-6 py-4 md:px-8'>
        <div className='flex items-start gap-3'>
          <IconButton
            ariaLabel='Back'
            color='gray'
            icon='lucide:arrow-left'
            size='sm'
            variant='ghost'
            onClick={onBack}
          />

          <div>
            <h1 className='text-18/6 font-semibold tracking-tight text-gray-13'>
              DMS & Folder Configuration
            </h1>
            <p className='text-13/5 text-gray-11'>
              Create and manage document repositories. No IT assistance
              required.
            </p>
          </div>
        </div>

        {!showWizard && (
          <button
            className='ml-auto inline-flex items-center gap-2 rounded-[10px] bg-primary-9 px-5 py-3 font-semibold text-white shadow-md'
            type='button'
            onClick={() => setShowWizard(true)}
          >
            <Plus size={18} />
            New Repository
          </button>
        )}
      </div>

      {!showWizard ? (
        <div className='px-6 py-4'>
          <div className='mt-4 mb-4 flex justify-end'>
            <div className='w-full max-w-xl'>
              <SettingsSearchInput
                placeholder='Search repositories...'
                value={search}
                onChange={setSearch}
              />
            </div>
          </div>

          <RepositoryTable rows={filteredRepositories} />
        </div>
      ) : (
        <div className='bg-surface'>
          <div className='flex'>
            <div className='max-h-[calc(100vh-200px)] overflow-y-auto'>
              <StepNav
                folderHierarchy={folderHierarchy}
                step={step}
                setFolderHierarchy={setFolderHierarchy}
                setStep={setStep}
              />
            </div>
            <div className='max-h-[calc(100vh-200px)] flex-1 overflow-y-auto p-6'>
              <WizardContent
                category={category}
                description={description}
                displayMode={displayMode}
                fields={fields}
                folderCoordinator={folderCoordinator}
                folderName={folderName}
                folderOwner={folderOwner}
                step={step}
                storage={storage}
                versioning={versioning}
                setCategory={setCategory}
                setDescription={setDescription}
                setDisplayMode={setDisplayMode}
                setFields={setFields}
                setFolderCoordinator={setFolderCoordinator}
                setFolderName={setFolderName}
                setFolderOwner={setFolderOwner}
                setStorage={setStorage}
                setVersioning={setVersioning}
              />
            </div>
          </div>

          <div className='flex items-center justify-between border-t border-gray-3 px-6 py-4'>
            {step === 1 ? (
              <button
                className='rounded-[8px] border border-gray-3 px-5 py-2 font-semibold'
                type='button'
                onClick={closeWizard}
              >
                Cancel
              </button>
            ) : (
              <button
                className='rounded-[8px] border border-gray-3 px-5 py-2 font-semibold'
                type='button'
                onClick={goBack}
              >
                Back
              </button>
            )}

            <div className='flex items-center gap-4'>
              <span className='text-sm text-gray-11'>Step {step} of 5</span>
              <button
                className='inline-flex items-center gap-2 rounded-[8px] bg-primary-9 px-5 py-2 font-semibold text-white'
                type='button'
                onClick={step === 5 ? handleCreateRepository : goNext}
              >
                {step === 5 ? 'Create Repository' : 'Continue'}
                {step !== 5 && <ChevronRight size={16} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ')
}

function FieldsTable({
  fields,
  setFields,
}: {
  fields: FieldRow[]
  setFields: Dispatch<SetStateAction<FieldRow[]>>
}) {
  const updateField = (id: string, key: ToggleFieldKey) => {
    setFields((prev) =>
      prev.map((field) =>
        field.id === id ? { ...field, [key]: !field[key] } : field,
      ),
    )
  }

  const columns = useMemo(
    () => [
      fieldColumnHelper.display({
        enableResizing: false,
        enableSorting: false,
        header: '',
        id: 'drag',
        maxSize: 44,
        meta: settingsHeaderMeta.center,
        minSize: 44,
        size: 44,
        cell: () => null,
      }),
      fieldColumnHelper.accessor('fieldName', {
        enableSorting: false,
        header: 'Field Name',
        id: 'fieldName',
        meta: settingsHeaderMeta.start,
        minSize: 200,
        size: 240,
        cell: ({ row }) => (
          <div className='min-w-0'>
            <div className='font-semibold text-gray-13'>
              {row.original.fieldName}
            </div>
            {row.original.system ? (
              <span className='mt-1 inline-flex rounded-md border border-gray-3 px-2 py-0.5 text-[11px]'>
                System
              </span>
            ) : null}
          </div>
        ),
      }),
      fieldColumnHelper.accessor('type', {
        enableSorting: false,
        header: 'Type',
        id: 'type',
        meta: settingsHeaderMeta.start,
        minSize: 100,
        size: 120,
        cell: ({ getValue }) => (
          <span className='text-gray-11'>{String(getValue())}</span>
        ),
      }),
      ...toggleFieldKeys.map((key) =>
        fieldColumnHelper.display({
          enableResizing: false,
          enableSorting: false,
          header: toggleFieldLabels[key],
          id: key,
          meta: settingsHeaderMeta.center,
          minSize: 110,
          size: 120,
          cell: ({ row }) => (
            <div className='flex justify-center'>
              <InputSwitch
                checked={Boolean(row.original[key])}
                onChange={() => updateField(row.original.id, key)}
              />
            </div>
          ),
        }),
      ),
    ],
    [setFields],
  )

  const table = useReactTable({
    ...settingsTableCoreOptions,
    columns,
    data: fields,
    getRowId: (row) => row.id,
  })

  return (
    <SettingsSortableDataTable
      table={table}
      onReorder={(nextRows) => setFields(nextRows)}
    />
  )
}
function RepositoryTable({ rows }: { rows: RepositoryRow[] }) {
  const columnHelper = createColumnHelper<RepositoryRow>()

  const columns = useMemo(
    () => [
      columnHelper.display({
        enableResizing: false,
        enableSorting: false,
        header: '',
        id: 'icon',
        maxSize: 64,
        meta: settingsHeaderMeta.center,
        minSize: 64,
        size: 64,
        cell: () => (
          <div className='flex justify-center'>
            <div className='flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-primary-3 text-primary-9'>
              <Folder size={21} />
            </div>
          </div>
        ),
      }),
      columnHelper.accessor('name', {
        enableSorting: false,
        header: 'Repository',
        meta: settingsHeaderMeta.start,
        minSize: 220,
        size: 260,
        cell: ({ row }) => (
          <div className='min-w-0'>
            <div className='truncate font-semibold text-gray-13'>
              {row.original.name}
            </div>
            <div className='truncate text-xs text-gray-11'>
              Owner: {row.original.owner}
            </div>
          </div>
        ),
      }),
      columnHelper.accessor('category', {
        enableSorting: false,
        header: 'Category',
        meta: settingsHeaderMeta.start,
        minSize: 120,
        size: 140,
        cell: (info) => (
          <span className='rounded-lg border border-gray-3 px-3 py-1 text-xs font-medium'>
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor('storage', {
        enableSorting: false,
        header: 'Storage',
        meta: settingsHeaderMeta.start,
        minSize: 120,
        size: 140,
        cell: (info) => (
          <span className='rounded-lg border border-gray-3 px-3 py-1 text-xs font-medium'>
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor('documents', {
        enableSorting: false,
        header: 'Documents',
        meta: settingsHeaderMeta.start,
        minSize: 130,
        size: 150,
        cell: (info) => `${info.getValue().toLocaleString()} documents`,
      }),
      columnHelper.accessor('versioning', {
        enableSorting: false,
        header: 'Versioning',
        meta: settingsHeaderMeta.start,
        minSize: 110,
        size: 120,
      }),
      columnHelper.accessor('status', {
        enableSorting: false,
        header: 'Status',
        meta: settingsHeaderMeta.start,
        minSize: 100,
        size: 110,
        cell: (info) => (
          <span
            className={cn(
              'rounded-lg px-3 py-1 text-xs font-semibold capitalize',
              info.getValue() === 'active'
                ? 'bg-primary-9 text-white'
                : 'bg-gray-2 text-gray-13',
            )}
          >
            {info.getValue()}
          </span>
        ),
      }),
    ],
    [columnHelper],
  )

  const table = useReactTable({
    ...settingsTableCoreOptions,
    columns,
    data: rows,
  })

  return (
    <DataTable
      component={<div />}
      isReLoading={false}
      pageSize={rows.length || 5}
      table={table}
      stickyHeader
      onReload={() => undefined}
    />
  )
}

function SortableHierarchyItem({ item }: SortableHierarchyItemProps) {
  const {
    attributes,
    isDragging,
    listeners,
    transform,
    transition,
    setNodeRef,
  } = useSortable({ id: item })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex items-center gap-2 rounded-[9px] border border-gray-3 bg-[var(--surface-secondary)] px-3 py-2 text-sm text-gray-13 shadow-sm transition',
        isDragging && 'z-50 opacity-80 shadow-lg',
      )}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <button
        aria-label={`Drag ${item}`}
        className='flex cursor-grab items-center text-gray-10 outline-none active:cursor-grabbing'
        type='button'
        {...attributes}
        {...listeners}
      >
        <GripVertical size={14} />
      </button>
      <span className='truncate'>{item}</span>
    </div>
  )
}

function StepIcon({ step }: { step: WizardStep }) {
  return <span className='text-xs font-bold'>{step}</span>
}

function StepNav({
  folderHierarchy,
  step,
  setFolderHierarchy,
  setStep,
}: {
  folderHierarchy: string[]
  setFolderHierarchy: Dispatch<SetStateAction<string[]>>
  step: WizardStep
  setStep: (step: WizardStep) => void
}) {
  const [newLevel, setNewLevel] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    setFolderHierarchy((items) => {
      const oldIndex = items.indexOf(String(active.id))
      const newIndex = items.indexOf(String(over.id))

      if (oldIndex === -1 || newIndex === -1) return items

      return arrayMove(items, oldIndex, newIndex)
    })
  }

  const handleAddLevel = () => {
    const value = newLevel.trim()

    if (!value) return

    const alreadyExists = folderHierarchy.some(
      (item) => item.toLowerCase() === value.toLowerCase(),
    )

    if (alreadyExists) {
      setNewLevel('')
      return
    }

    setFolderHierarchy((prev) => [...prev, value])
    setNewLevel('')
  }

  return (
    <div className='h-full w-[310px] shrink-0 border-r border-gray-3 bg-surface p-5'>
      <div className='relative pb-2'>
        {wizardSteps.map((item, index) => {
          const isCompleted = step > item.id
          const isActive = step === item.id

          return (
            <button
              key={item.id}
              type='button'
              className={cn(
                'group flex w-full items-center gap-4 rounded-[14px] px-3 py-3 text-left transition',
                isActive && '',
              )}
              onClick={() => setStep(item.id)}
            >
              <div className='relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--gray-3)]'>
                {index < wizardSteps.length - 1 && (
                  <span className='absolute top-8 left-1/2 h-12 w-[1.5px] -translate-x-1/2 bg-[var(--gray-3)]' />
                )}

                <span
                  className={cn(
                    'z-10 flex h-8 w-8 items-center justify-center rounded-full transition',
                    isCompleted
                      ? 'bg-primary-3 text-primary-9'
                      : 'bg-[var(--gray-3)] text-[var(--gray-10)]',
                  )}
                >
                  {isCompleted ? (
                    <Check size={14} />
                  ) : (
                    <StepIcon step={item.id} />
                  )}
                </span>
              </div>

              <div className='min-w-0'>
                <div className='text-sm font-semibold text-[var(--indigo-12)]'>
                  {item.title}
                </div>
                <div className='mt-0.5 truncate text-xs text-gray-11'>
                  {item.description}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <div className='mt-5 border-t border-gray-3 pt-4 pb-5'>
        <div className='mb-3 text-xs font-bold text-gray-11 uppercase'>
          Folder Hierarchy
        </div>

        <DndContext
          collisionDetection={closestCenter}
          sensors={sensors}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={folderHierarchy}
            strategy={verticalListSortingStrategy}
          >
            <div className='space-y-2 rounded-md bg-surface-muted/60'>
              {folderHierarchy.map((item) => (
                <SortableHierarchyItem item={item} key={item} />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <div className='mt-2 flex items-end gap-2'>
          <InputText
            className='flex-1'
            label='Add level'
            placeholder='Add level...'
            value={newLevel}
            onChange={setNewLevel}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                handleAddLevel()
              }
            }}
          />
          <Button
            aria-label='Add hierarchy level'
            className='mb-0.5'
            icon='lucide:plus'
            size='sm'
            variant='solid'
            onClick={handleAddLevel}
          />
        </div>
      </div>
    </div>
  )
}

function WizardContent({
  category,
  description,
  displayMode,
  fields,
  folderCoordinator,
  folderName,
  folderOwner,
  step,
  storage,
  versioning,
  setCategory,
  setDescription,
  setDisplayMode,
  setFields,
  setFolderCoordinator,
  setFolderName,
  setFolderOwner,
  setStorage,
  setVersioning,
}: {
  category: SelectOption
  description: string
  displayMode: string
  fields: FieldRow[]
  folderCoordinator: string
  folderName: string
  folderOwner: string
  setCategory: Dispatch<SetStateAction<SelectOption>>
  setDescription: Dispatch<SetStateAction<string>>
  setDisplayMode: Dispatch<SetStateAction<string>>
  setFields: Dispatch<SetStateAction<FieldRow[]>>
  setFolderCoordinator: Dispatch<SetStateAction<string>>
  setFolderName: Dispatch<SetStateAction<string>>
  setFolderOwner: Dispatch<SetStateAction<string>>
  setStorage: Dispatch<SetStateAction<string>>
  setVersioning: Dispatch<SetStateAction<string>>
  step: WizardStep
  storage: string
  versioning: string
}) {
  const [newFieldName, setNewFieldName] = useState('')
  const [newFieldType, setNewFieldType] = useState('Alphanumeric')

  const addField = () => {
    const trimmedName = newFieldName.trim()
    if (!trimmedName) return

    setFields((prev) => [
      ...prev,
      {
        fieldName: trimmedName,
        id: `${trimmedName}-${Date.now()}`,
        mandatory: false,
        ocrExtract: false,
        searchable: true,
        showInList: true,
        syncField: false,
        type: newFieldType,
      },
    ])
    setNewFieldName('')
    setNewFieldType('Alphanumeric')
  }

  if (step === 1) {
    return (
      <div className='space-y-5'>
        <p className='text-sm text-gray-11'>
          Define the basic information for your document repository.
        </p>

        <InputText
          label='Folder Name *'
          placeholder='e.g. AP Invoices 2026'
          value={folderName}
          onChange={(value: string) => setFolderName(value)}
        />

        <InputTextarea
          label='Description'
          minRows={3}
          placeholder='Describe the purpose of this repository...'
          value={description}
          onChange={setDescription}
        />

        <div>
          <label className='mb-2 block text-sm font-semibold text-gray-13'>
            Category
          </label>
          <InputSelect
            options={categoryOptions}
            value={category}
            onChange={(item: SelectOption | null) => {
              if (!item) return
              setCategory(item)
            }}
          />
        </div>

        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          <InputText
            label='Folder Owner'
            placeholder='Owner name or email'
            value={folderOwner}
            onChange={(value: string) => setFolderOwner(value)}
          />

          <InputText
            label='Folder Coordinator'
            placeholder='Coordinator name or email'
            value={folderCoordinator}
            onChange={(value: string) => setFolderCoordinator(value)}
          />
        </div>
      </div>
    )
  }

  if (step === 2) {
    return (
      <div>
        <p className='mb-5 text-sm text-gray-11'>
          Choose where documents in this repository will be stored.
        </p>
        <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
          {storageOptions.map((item) => {
            const Icon = item.icon as ElementType
            return (
              <button
                key={item.id}
                type='button'
                className={cn(
                  'flex items-center gap-4 rounded-[12px] border p-4 text-left transition',
                  storage === item.id
                    ? 'border-primary-9 bg-primary-2'
                    : 'border-gray-3 bg-surface hover:bg-surface-muted',
                )}
                onClick={() => setStorage(item.id)}
              >
                <span className='flex h-10 w-10 items-center justify-center rounded-[10px] bg-gray-2 text-gray-11'>
                  <Icon size={20} />
                </span>
                <span>
                  <span className='block font-semibold text-gray-13'>
                    {item.title}
                  </span>
                  <span className='text-sm text-gray-11'>{item.subtitle}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  if (step === 3) {
    return (
      <div className='space-y-5'>
        <div className='flex flex-wrap items-center justify-between gap-4'>
          <div>
            <h3 className='font-bold text-gray-13'>
              Document Fields Configuration
            </h3>
            <p className='text-sm text-gray-11'>
              Configure metadata fields. Mark each as OCR Extract or Sync field.
            </p>
          </div>
          <div className='flex gap-4 text-sm text-gray-11'>
            <span>
              <RefreshCw className='inline' size={13} /> OCR Extract
            </span>
            <span>
              <RefreshCw className='inline' size={13} /> Sync Field
            </span>
          </div>
        </div>

        <div className='rounded-[12px] border border-gray-3 bg-surface-muted p-4'>
          <div className='mb-3 text-xs font-bold text-gray-11 uppercase'>
            Add New Field
          </div>
          <div className='grid grid-cols-1 gap-3 md:grid-cols-[1fr_160px_160px]'>
            <InputText
              placeholder='e.g. Cost Center'
              value={newFieldName}
              onChange={setNewFieldName}
            />
            <InputSelect
              options={fieldTypeOptions}
              placeholder='Field type'
              value={
                fieldTypeOptions.find(
                  (option) => option.name === newFieldType,
                ) || fieldTypeOptions[0]
              }
              onChange={(selected) => {
                if (!selected) return
                setNewFieldType(selected.name)
              }}
            />
            <Button
              className='self-end'
              icon='lucide:plus'
              label='Add Field'
              onClick={addField}
            />
          </div>
        </div>

        <FieldsTable fields={fields} setFields={setFields} />
      </div>
    )
  }

  if (step === 4) {
    return (
      <div className='space-y-5'>
        <p className='text-sm text-gray-11'>
          Choose how document versions are managed in this repository.
        </p>
        <h3 className='font-bold text-gray-13'>Version Strategy</h3>
        {versionOptions.map((item) => (
          <button
            key={item.id}
            type='button'
            className={cn(
              'block w-full rounded-[12px] border p-4 text-left transition',
              versioning === item.id
                ? 'border-primary-9 bg-primary-2'
                : 'border-gray-3 hover:bg-surface-muted',
            )}
            onClick={() => setVersioning(item.id)}
          >
            <div className='font-semibold text-gray-13'>{item.title}</div>
            <div className='text-sm text-gray-11'>{item.subtitle}</div>
            <code className='mt-2 inline-block rounded bg-gray-2 px-2 py-1 text-xs'>
              {item.sample}
            </code>
          </button>
        ))}

        <h3 className='font-bold text-gray-13'>Display Settings</h3>
        {[
          'Show Latest Version Only',
          'Show All Versions',
          'Version History Panel',
        ].map((item) => (
          <button
            key={item}
            type='button'
            className={cn(
              'flex w-full items-center gap-3 rounded-[10px] border p-3 text-left transition',
              displayMode === item
                ? 'border-primary-9 bg-primary-2'
                : 'border-gray-3 hover:bg-surface-muted',
            )}
            onClick={() => setDisplayMode(item)}
          >
            <span
              className={cn(
                'h-4 w-4 rounded-full border',
                displayMode === item
                  ? 'border-primary-9 bg-primary-9'
                  : 'border-primary-9 bg-surface',
              )}
            />
            {item}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div>
      <p className='mb-5 text-sm text-gray-11'>
        Connect external ERP or business systems and map repository fields for
        synchronization.
      </p>
      <div className='mb-3 text-xs font-bold text-gray-11 uppercase'>
        Available Connections
      </div>
      <div className='grid grid-cols-1 gap-3 md:grid-cols-3'>
        {integrations.map((item) => (
          <div className='rounded-[10px] border border-gray-3 p-3' key={item}>
            <div className='mb-3 font-semibold text-gray-13'>{item}</div>
            <button
              className='flex h-8 w-full items-center justify-center gap-2 rounded-[8px] border border-gray-3 text-sm font-semibold hover:bg-surface-muted'
              type='button'
            >
              <Link2 size={14} /> Connect
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
