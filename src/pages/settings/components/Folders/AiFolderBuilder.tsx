import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { motion } from 'motion/react'
import GoogleDriveLogo from '@/assets/brands/googledrive.svg'
import OneDriveLogo from '@/assets/brands/onedrive.svg'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import AiBrandIcon from '@/components/common/AiBrandIcon'
import InputSelect from '@/components/base/inputs/InputSelect'
import SortableContainer from '@/components/base/sortable/SortableContainer'
import SortableItem from '@/components/base/sortable/SortableItem'
import showToast from '@/components/base/toast/showToast'
import {
  generateFolderConfig,
  type FolderConfigField,
  type FolderConfigSuggestion,
} from '@/services/ai/gemini'
import type { Option } from '@/types/option'
import cn from '@/utils/cn'
import {
  BuilderTimelineStep,
  type TimelineConnectorState,
} from './AiFolderBuilderTimeline'

type BuilderStepId = 1 | 2 | 3 | 4 | 5 | 6

type ChatPhase =
  | 'welcome'
  | 'name'
  | 'details_ready'
  | 'storage'
  | 'fields'
  | 'fields_ready'
  | 'versioning'
  | 'integrations'
  | 'ready'

type ChipOption = {
  icon?: string
  label: string
  logo?: string
  value: string
}

type ChatMessage = {
  chips?: ChipOption[]
  id: string
  role: 'user' | 'assistant'
  stepId?: BuilderStepId
  text: string
}

type DraftAnswers = {
  description: string
  folderName: string
  integrations: string
  storage: string
  structure: string
  versioning: string
}

type EditableField = FolderConfigField & {
  aiGenerated?: boolean
  id: string
}

export type AiFolderBuilderApplyPayload = {
  description: string
  fields: FolderConfigField[]
  folderName: string
  integrations: string
  storage: string
  versioning: string
}

type AiFolderBuilderProps = {
  onBack: () => void
  onApply: (payload: AiFolderBuilderApplyPayload) => void
}

const BUILDER_STEPS: Array<{
  description: string
  id: BuilderStepId
  title: string
}> = [
  {
    description:
      'Set the folder name and let AI draft a clear business description for this repository.',
    id: 1,
    title: 'Folder Details',
  },
  {
    description:
      'Choose where documents in this folder will be stored and accessed.',
    id: 2,
    title: 'Storage',
  },
  {
    description:
      'Define metadata fields used for search, filtering, and folder structure.',
    id: 3,
    title: 'Fields',
  },
  {
    description:
      'Decide how document revisions are tracked when files are updated.',
    id: 4,
    title: 'Versioning',
  },
  {
    description:
      'Optionally connect ERP or other systems so data can sync with this folder.',
    id: 5,
    title: 'Integrations',
  },
  {
    description:
      'Review your full folder setup, then apply it to create the repository.',
    id: 6,
    title: 'Review',
  },
]

const STORAGE_CHIPS: ChipOption[] = [
  { label: 'EZOFIS Drive', logo: '/favicon.svg', value: 'EZOFIS Drive' },
  { label: 'OneDrive', logo: OneDriveLogo, value: 'One Drive' },
  { label: 'Google Drive', logo: GoogleDriveLogo, value: 'Google Drive' },
]

const FIELD_CHIPS: ChipOption[] = [
  {
    icon: 'tabler:sparkles',
    label: 'Recommend fields',
    value: 'Suggest the best metadata fields and folder structure for this folder',
  },
  {
    label: 'By supplier / vendor',
    value: 'Organize by supplier or vendor, then document type',
  },
  {
    label: 'By employee',
    value: 'Organize by employee, then document type',
  },
  {
    label: 'By document type',
    value: 'Organize primarily by document type',
  },
  {
    label: 'By customer',
    value: 'Organize by customer, then document type',
  },
]

const VERSIONING_CHIPS: ChipOption[] = [
  { label: 'Incremental Version', value: 'Incremental Version' },
  { label: 'Timestamp Version', value: 'Timestamp Version' },
  { label: 'Replace Existing', value: 'Replace Existing' },
]

const INTEGRATION_CHIPS: ChipOption[] = [
  { label: 'No integrations', value: 'None' },
  { label: 'SAP', value: 'SAP' },
  { label: 'Oracle ERP', value: 'Oracle ERP' },
  { label: 'Microsoft Dynamics', value: 'Microsoft Dynamics' },
  { label: 'QuickBooks', value: 'QuickBooks' },
  { label: 'Custom API', value: 'Custom API' },
]

const STORAGE_META: Record<
  string,
  { icon?: string; label: string; logo?: string }
> = {
  'EZOFIS Drive': { label: 'EZOFIS Drive', logo: '/favicon.svg' },
  'One Drive': { label: 'OneDrive', logo: OneDriveLogo },
  'Google Drive': { label: 'Google Drive', logo: GoogleDriveLogo },
}

const NAME_CHIPS: ChipOption[] = [
  { label: 'Accounts Payable', value: 'Accounts Payable' },
  { label: 'Accounts Receivable', value: 'Accounts Receivable' },
  { label: 'HR Documents', value: 'HR Documents' },
  { label: 'Legal Contracts', value: 'Legal Contracts' },
]

const EXAMPLE_PROMPTS: ChipOption[] = [
  {
    label: 'HR payslips folder',
    value: '__prompt__:Create an HR folder for payslips and employee documents',
  },
  {
    label: 'Legal contracts folder',
    value:
      '__prompt__:Create a Legal folder for contracts and compliance documents',
  },
  {
    label: 'Accounts payable folder',
    value:
      '__prompt__:Create an Accounts Payable folder for invoices, POs, and vendor bills',
  },
]

const NAME_QUESTION =
  'To begin: what should this folder be named? Use a clear business name, choose an example below, or describe a full folder idea to generate a complete setup.'

const RECOMMEND_FIELDS_VALUE =
  'Suggest the best metadata fields and folder structure for this folder'

function toEditableFields(fields: FolderConfigField[]): EditableField[] {
  return sortFieldsByType(
    fields.map((field) => ({
      ...field,
      aiGenerated: true,
      id: crypto.randomUUID(),
    })),
  )
}

function stripEditableIds(fields: EditableField[]): FolderConfigField[] {
  return fields.map(
    ({ dataType, fieldName, iconKey, includeInFolderStructure, isMandatory }) => ({
      dataType,
      fieldName,
      iconKey,
      includeInFolderStructure,
      isMandatory,
    }),
  )
}

function fieldVisual(includeInFolderStructure: boolean) {
  if (includeInFolderStructure) {
    return {
      bg: 'bg-[var(--primary-3)]',
      color: 'text-[var(--primary-11)]',
      icon: 'lucide:folder',
    }
  }
  return {
    bg: 'bg-[var(--blue-3)]',
    color: 'text-[var(--blue-11)]',
    icon: 'lucide:file-text',
  }
}

function phaseToStep(phase: ChatPhase): BuilderStepId {
  if (phase === 'welcome' || phase === 'name' || phase === 'details_ready') {
    return 1
  }
  if (phase === 'storage') return 2
  if (phase === 'fields' || phase === 'fields_ready') return 3
  if (phase === 'versioning') return 4
  if (phase === 'integrations') return 5
  return 6
}

function TypewriterText({
  text,
  active,
  onDone,
  speed = 12,
}: {
  text: string
  active: boolean
  onDone?: () => void
  speed?: number
}) {
  const [shown, setShown] = useState(() => (active ? '' : text))
  const doneRef = useRef(false)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useEffect(() => {
    if (!active) {
      setShown(text)
      return
    }

    doneRef.current = false
    setShown('')
    let index = 0
    const id = window.setInterval(() => {
      index += 1
      setShown(text.slice(0, index))
      if (index >= text.length) {
        window.clearInterval(id)
        if (!doneRef.current) {
          doneRef.current = true
          onDoneRef.current?.()
        }
      }
    }, speed)

    return () => window.clearInterval(id)
  }, [active, speed, text])

  return (
    <span>
      {shown}
      {active && shown.length < text.length ? (
        <span className='ml-0.5 inline-block h-[1em] w-[2px] animate-pulse bg-[var(--primary-9)] align-[-2px]' />
      ) : null}
    </span>
  )
}

function AiSparkleIcon({ size = 14 }: { size?: number }) {
  return (
    <AiBrandIcon
      className='shrink-0'
      style={{ height: size, width: size }}
      variant='curved-purple'
    />
  )
}

function SparkIconLoading({ size = 14 }: { size?: number }) {
  return (
    <motion.div
      animate={{
        opacity: [0.55, 1, 0.55],
        rotate: [0, 8, -8, 0],
        scale: [0.92, 1.12, 0.92],
      }}
      className='inline-flex text-primary-9'
      transition={{ duration: 1.6, ease: 'easeInOut', repeat: Infinity }}
    >
      <AiSparkleIcon size={size} />
    </motion.div>
  )
}

function AiGeneratedBadge({ label = 'AI generated' }: { label?: string }) {
  return (
    <span className='inline-flex items-center gap-1 rounded-full border border-primary-4 bg-primary-3 px-2 py-0.5 text-[10px] font-semibold text-primary-9'>
      <AiSparkleIcon size={12} />
      {label}
    </span>
  )
}

function SuggestionChipRow({
  chips,
  disabled,
  onSelect,
}: {
  chips: ChipOption[]
  disabled?: boolean
  onSelect: (value: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const maxVisible = 3
  const hasOverflow = chips.length > maxVisible
  const visibleChips = expanded ? chips : chips.slice(0, maxVisible)
  const hiddenCount = chips.length - maxVisible

  return (
    <div className='flex max-w-full flex-wrap items-center gap-2'>
      {visibleChips.map((chip) => (
        <button
          className='inline-flex items-center gap-2 rounded-full border border-primary-4 bg-primary-2 px-3.5 py-2 text-[12px] font-semibold whitespace-nowrap text-primary-11 transition hover:border-primary-9 hover:bg-primary-3 hover:text-primary-9 disabled:opacity-50'
          disabled={disabled}
          key={chip.value}
          type='button'
          onClick={() => onSelect(chip.value)}
        >
          {chip.logo ? (
            <img alt='' className='size-3.5 object-contain' src={chip.logo} />
          ) : null}
          {chip.icon ? (
            chip.icon === 'tabler:sparkles' ? (
              <AiBrandIcon className='size-3.5' />
            ) : (
              <Icon className='size-3.5 text-primary-9' name={chip.icon} />
            )
          ) : null}
          {chip.label}
        </button>
      ))}

      {hasOverflow && !expanded ? (
        <button
          className='inline-flex items-center rounded-full border border-primary-5 bg-surface px-3.5 py-2 text-[12px] font-semibold whitespace-nowrap text-primary-9 transition hover:bg-primary-2 disabled:opacity-50'
          disabled={disabled}
          type='button'
          onClick={() => setExpanded(true)}
        >
          More (+{hiddenCount})
        </button>
      ) : null}

      {hasOverflow && expanded ? (
        <button
          className='inline-flex items-center rounded-full border border-primary-5 bg-surface px-3.5 py-2 text-[12px] font-semibold whitespace-nowrap text-primary-9 transition hover:bg-primary-2 disabled:opacity-50'
          disabled={disabled}
          type='button'
          onClick={() => setExpanded(false)}
        >
          Less
        </button>
      ) : null}
    </div>
  )
}

function StorageBadge({ storage }: { storage: string }) {
  const meta = STORAGE_META[storage]
  if (!meta) {
    return (
      <span className='inline-flex items-center gap-1.5 rounded-full bg-primary-3 px-2.5 py-1 text-[11px] font-semibold text-primary-9'>
        {storage}
      </span>
    )
  }

  return (
    <span className='inline-flex items-center gap-1.5 rounded-full bg-primary-3 px-2.5 py-1 text-[11px] font-semibold text-primary-9'>
      {meta.logo ? (
        <img alt='' className='size-3.5 object-contain' src={meta.logo} />
      ) : null}
      {meta.label}
    </span>
  )
}

const FIELD_DATA_TYPES = [
  'SHORT_TEXT',
  'LONG_TEXT',
  'NUMBER',
  'DATE',
  'DATE_TIME',
  'TIME',
  'CURRENCY_AMOUNT',
  'SINGLE_SELECT',
  'MULTI_SELECT',
  'YES_NO_TOGGLE',
  'EMAIL',
  'PHONE_NUMBER',
  'URL',
  'FILE_UPLOAD',
] as const

const formatDataTypeLabel = (value: string) =>
  value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())

const FIELD_TYPE_OPTIONS: Option[] = FIELD_DATA_TYPES.map((type) => ({
  id: type,
  name: formatDataTypeLabel(type),
  value: type,
}))

function sortFieldsByType(fields: EditableField[]): EditableField[] {
  const folderFields = fields.filter((field) => field.includeInFolderStructure)
  const normalFields = fields.filter((field) => !field.includeInFolderStructure)
  return [...folderFields, ...normalFields]
}

const FOLDER_TREE_STEP = 22

function FolderTreeLines({
  depth,
  isLast: _isLast,
}: {
  depth: number
  isLast: boolean
}) {
  if (depth <= 0) return null

  return (
    <div
      className='relative mr-1 shrink-0 self-stretch'
      style={{
        marginLeft: (depth - 1) * FOLDER_TREE_STEP,
        width: FOLDER_TREE_STEP,
      }}
    >
      <span
        className='absolute top-0 left-1/2 w-px -translate-x-1/2 bg-[var(--gray-5)]'
        style={{ height: '50%' }}
      />
      <span
        className='absolute top-1/2 left-1/2 h-px bg-[var(--gray-5)]'
        style={{ width: FOLDER_TREE_STEP / 2 }}
      />
    </div>
  )
}

function FieldTypeInlineSelect({
  value,
  onChange,
}: {
  value: string
  onChange: (dataType: string) => void
}) {
  const [showSelect, setShowSelect] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const selected =
    FIELD_TYPE_OPTIONS.find((option) => option.value === value) ||
    FIELD_TYPE_OPTIONS[0]

  const keepOpen = showSelect || dropdownOpen

  if (!keepOpen) {
    return (
      <button
        className='rounded px-1 py-0.5 text-left text-[12px] text-[var(--gray-10)] transition hover:bg-[var(--gray-3)] hover:text-[var(--gray-12)]'
        type='button'
        onClick={() => setShowSelect(true)}
      >
        {formatDataTypeLabel(value)}
      </button>
    )
  }

  return (
    <div className='max-w-[180px]'>
      <InputSelect
        autoOpen
        classNames={{ input: 'h-7 text-12' }}
        options={FIELD_TYPE_OPTIONS}
        width='target'
        value={selected}
        onChange={(option) => {
          if (!option?.value) return
          onChange(String(option.value))
        }}
        onDropdownClose={() => {
          setDropdownOpen(false)
          setShowSelect(false)
        }}
        onDropdownOpen={() => setDropdownOpen(true)}
      />
    </div>
  )
}

function FieldsEditor({
  fields,
  onChange,
}: {
  fields: EditableField[]
  onChange: (fields: EditableField[]) => void
}) {
  const [newFieldName, setNewFieldName] = useState('')
  const [newIsMandatory, setNewIsMandatory] = useState(false)
  const [newIsFolder, setNewIsFolder] = useState(false)

  const folderFields = fields.filter((field) => field.includeInFolderStructure)
  const metadataFields = fields.filter(
    (field) => !field.includeInFolderStructure,
  )

  const handleReorder = (ids: string[]) => {
    const map = new Map(fields.map((field) => [field.id, field]))
    const reordered = ids.map((id) => map.get(id)!).filter(Boolean)
    onChange(sortFieldsByType(reordered))
  }

  const updateField = (id: string, patch: Partial<EditableField>) => {
    const next = fields.map((field) =>
      field.id === id ? { ...field, ...patch } : field,
    )
    onChange(
      'includeInFolderStructure' in patch ? sortFieldsByType(next) : next,
    )
  }

  const removeField = (id: string) => {
    onChange(fields.filter((field) => field.id !== id))
  }

  const addField = () => {
    const name = newFieldName.trim().slice(0, 20)
    if (!name) return
    onChange(
      sortFieldsByType([
        ...fields,
        {
          dataType: 'SHORT_TEXT',
          fieldName: name,
          iconKey: newIsFolder ? 'folder' : 'document',
          id: crypto.randomUUID(),
          includeInFolderStructure: newIsFolder,
          isMandatory: newIsFolder || newIsMandatory,
          aiGenerated: false,
        },
      ]),
    )
    setNewFieldName('')
    setNewIsMandatory(false)
    setNewIsFolder(false)
  }

  const addFieldVisual = fieldVisual(newIsFolder)

  const renderAddFieldRow = (key: string) => (
    <div
      className='flex w-full items-center rounded-[12px] border border-dashed border-[var(--gray-4)] bg-[var(--gray-1)] px-2.5 py-2'
      key={key}
    >
      <span className='flex size-8 shrink-0' aria-hidden />

      <button
        aria-label={
          newIsFolder ? 'Change to normal field' : 'Change to folder field'
        }
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-[8px] transition hover:opacity-90',
          addFieldVisual.bg,
          addFieldVisual.color,
        )}
        title={
          newIsFolder
            ? 'Folder field — click for normal'
            : 'Normal field — click for folder'
        }
        type='button'
        onClick={() => {
          setNewIsFolder((prev) => {
            const next = !prev
            if (next) setNewIsMandatory(true)
            return next
          })
        }}
      >
        <Icon className='size-4' name={addFieldVisual.icon} />
      </button>

      <div className='flex min-w-0 flex-1 items-center px-1'>
        <input
          className='w-auto min-w-0 rounded-md border border-transparent bg-transparent px-1 py-0.5 text-[13px] font-semibold text-[var(--gray-13)] outline-none placeholder:font-medium placeholder:text-[var(--gray-8)] hover:border-[var(--gray-4)] focus:border-[var(--primary-6)] focus:bg-surface'
          maxLength={20}
          placeholder='Field name'
          size={Math.max(newFieldName.length, 10)}
          value={newFieldName}
          onChange={(event) => setNewFieldName(event.target.value.slice(0, 20))}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              addField()
            }
          }}
        />
        <div className='min-w-0 flex-1' />
      </div>

      <button
        aria-label={
          newIsMandatory || newIsFolder
            ? 'Mark as optional'
            : 'Mark as mandatory'
        }
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded text-[16px] font-semibold leading-none transition',
          newIsFolder || newIsMandatory
            ? 'text-[var(--red-10)]'
            : 'text-[var(--gray-6)] hover:bg-[var(--red-3)] hover:text-[var(--red-9)]',
        )}
        disabled={newIsFolder}
        title={
          newIsFolder
            ? 'Folder fields are mandatory'
            : newIsMandatory
              ? 'Mandatory — click to make optional'
              : 'Optional — click to make mandatory'
        }
        type='button'
        onClick={() => setNewIsMandatory((prev) => !prev)}
      >
        *
      </button>

      <button
        aria-label='Add field'
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-[8px] transition',
          newFieldName.trim()
            ? 'bg-primary-10 text-white hover:opacity-90'
            : 'bg-[var(--gray-3)] text-[var(--gray-8)]',
        )}
        disabled={!newFieldName.trim()}
        title='Add field'
        type='button'
        onClick={addField}
      >
        <Icon className='size-4' name='lucide:plus' />
      </button>
    </div>
  )

  const renderFieldRow = (
    field: EditableField,
    options?: { depth?: number; isLast?: boolean; showTree?: boolean },
  ) => {
    const visual = fieldVisual(field.includeInFolderStructure)
    const showTree = options?.showTree ?? false
    const depth = options?.depth ?? 0

    return (
      <div
        className={cn('flex items-stretch', showTree ? 'gap-0' : undefined)}
        key={field.id}
      >
        {showTree ? (
          <FolderTreeLines depth={depth} isLast={options?.isLast ?? true} />
        ) : null}
        <SortableItem
          className='relative min-w-0 flex-1 items-center rounded-[12px] border border-[var(--gray-3)] bg-[var(--gray-1)] px-2.5 py-2'
          handlerClassName='size-8 text-[var(--gray-9)]'
          handlerPosition='before'
          id={field.id}
          trailing={
            <button
              aria-label={`Remove ${field.fieldName}`}
              className='flex size-8 shrink-0 items-center justify-center rounded text-[var(--gray-9)] transition hover:bg-[var(--red-3)] hover:text-[var(--red-11)]'
              type='button'
              onClick={() => removeField(field.id)}
            >
              <Icon className='size-3.5' name='lucide:trash-2' />
            </button>
          }
        >
          {field.aiGenerated ? (
            <span
              className='absolute -top-1.5 -right-1.5 z-10 flex size-5 items-center justify-center rounded-full border border-primary-4 bg-primary-2 text-primary-9 shadow-sm'
              title='Generated by AI'
            >
              <AiBrandIcon className='size-3' />
            </span>
          ) : null}
          <button
            aria-label={
              field.includeInFolderStructure
                ? 'Change to normal field'
                : 'Change to folder field'
            }
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-[8px] transition hover:opacity-90',
              visual.bg,
              visual.color,
            )}
            title={
              field.includeInFolderStructure
                ? 'Folder field — click for normal'
                : 'Normal field — click for folder'
            }
            type='button'
            onClick={() =>
              updateField(field.id, {
                includeInFolderStructure: !field.includeInFolderStructure,
              })
            }
          >
            <Icon className='size-4' name={visual.icon} />
          </button>

          <div className='min-w-0 flex-1 space-y-0.5 px-1'>
            <div className='flex items-center gap-0.5'>
              <input
                className='w-auto min-w-0 max-w-full rounded-md border border-transparent bg-transparent px-1 py-0.5 text-[13px] font-semibold text-[var(--gray-13)] outline-none hover:border-[var(--gray-4)] focus:border-[var(--primary-6)] focus:bg-surface'
                maxLength={20}
                size={Math.max(field.fieldName.length, 1)}
                value={field.fieldName}
                onChange={(event) =>
                  updateField(field.id, {
                    fieldName: event.target.value.slice(0, 20),
                  })
                }
              />
              <button
                aria-label={
                  field.isMandatory ? 'Mark as optional' : 'Mark as mandatory'
                }
                className={cn(
                  'shrink-0 select-none text-[13px] font-semibold leading-none transition',
                  field.isMandatory
                    ? 'text-[var(--red-10)]'
                    : 'text-[var(--gray-6)] hover:text-[var(--red-9)]',
                )}
                title={
                  field.isMandatory
                    ? 'Mandatory — click to make optional'
                    : 'Optional — click to make mandatory'
                }
                type='button'
                onClick={() =>
                  updateField(field.id, {
                    isMandatory: !field.isMandatory,
                  })
                }
              >
                *
              </button>
            </div>
            <FieldTypeInlineSelect
              value={field.dataType}
              onChange={(dataType) => updateField(field.id, { dataType })}
            />
          </div>
        </SortableItem>
      </div>
    )
  }

  return (
    <div className='space-y-3'>
      {renderAddFieldRow('add-field-top')}

      <SortableContainer
        constrainToParent={false}
        items={fields.map((field) => field.id)}
        onItemsChange={handleReorder}
      >
        <div className='space-y-2'>
          {folderFields.map((field, index) =>
            renderFieldRow(field, {
              depth: index,
              isLast: index === folderFields.length - 1,
              showTree: true,
            }),
          )}
          {metadataFields.map((field) => renderFieldRow(field))}
        </div>
      </SortableContainer>

      {renderAddFieldRow('add-field-bottom')}
    </div>
  )
}

const emptyDraft = (): DraftAnswers => ({
  description: '',
  folderName: '',
  integrations: '',
  storage: '',
  structure: '',
  versioning: '',
})

export default function AiFolderBuilder({
  onBack,
  onApply,
}: AiFolderBuilderProps) {
  const initialGreetingId = useMemo(() => crypto.randomUUID(), [])
  const [phase, setPhase] = useState<ChatPhase>('name')
  const [activeStep, setActiveStep] = useState<BuilderStepId>(1)
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [draft, setDraft] = useState<DraftAnswers>(emptyDraft)
  const [editableFields, setEditableFields] = useState<EditableField[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      chips: [...NAME_CHIPS, ...EXAMPLE_PROMPTS],
      id: initialGreetingId,
      role: 'assistant',
      stepId: 1,
      text: NAME_QUESTION,
    },
  ])
  const [typingId, setTypingId] = useState<string | null>(initialGreetingId)
  const [editingFromReview, setEditingFromReview] = useState(false)
  const [aiDescriptionGenerated, setAiDescriptionGenerated] = useState(false)
  const [aiFieldsGenerated, setAiFieldsGenerated] = useState(false)
  const listRef = useRef<HTMLDivElement | null>(null)
  const stepNodeRefs = useRef<Partial<Record<BuilderStepId, HTMLDivElement | null>>>(
    {},
  )

  useEffect(() => {
    const node = listRef.current
    if (!node) return
    if (editingFromReview) return
    node.scrollTop = node.scrollHeight
  }, [messages, isSending, typingId, activeStep, phase, editableFields, editingFromReview])

  const completedSteps = useMemo(() => {
    const done = new Set<BuilderStepId>()
    if (draft.folderName.trim() && draft.description.trim() && activeStep > 1) {
      done.add(1)
    }
    if (draft.storage.trim() && activeStep > 2) done.add(2)
    if (editableFields.length > 0 && activeStep > 3) done.add(3)
    if (draft.versioning.trim() && activeStep > 4) done.add(4)
    if (draft.integrations.trim() && activeStep > 5) done.add(5)
    if (phase === 'ready') {
      done.add(1)
      done.add(2)
      done.add(3)
      done.add(4)
      done.add(5)
    }
    return done
  }, [activeStep, draft, editableFields.length, phase])

  const unlockedStep =
    phase === 'ready'
      ? 6
      : Math.max(activeStep, ...Array.from(completedSteps), 1)

  const canApply =
    Boolean(draft.folderName.trim()) &&
    Boolean(draft.description.trim()) &&
    Boolean(draft.storage.trim()) &&
    editableFields.length > 0 &&
    Boolean(draft.versioning.trim()) &&
    Boolean(draft.integrations.trim())

  const pushAssistant = (
    text: string,
    chips?: ChatMessage['chips'],
    nextPhase?: ChatPhase,
    nextStep?: BuilderStepId,
  ) => {
    const id = crypto.randomUUID()
    const stepId = nextStep ?? phaseToStep(nextPhase || phase)
    setTypingId(id)
    if (nextPhase) setPhase(nextPhase)
    if (nextStep) setActiveStep(nextStep)
    setMessages((prev) => [
      ...prev,
      {
        chips,
        id,
        role: 'assistant',
        stepId,
        text,
      },
    ])
  }

  const handleAssistantTypingDone = (messageId: string) => {
    setTypingId((current) => (current === messageId ? null : current))
  }

  const appendUser = (text: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: 'user',
        stepId: phaseToStep(phase),
        text,
      },
    ])
  }

  const applySuggestionToDraft = (
    suggestion: FolderConfigSuggestion,
    answers: DraftAnswers,
  ) => {
    const folderName = answers.folderName || suggestion.folderName
    const description =
      answers.description.trim() || suggestion.description
    setDraft({
      description,
      folderName,
      integrations: answers.integrations || 'None',
      storage: answers.storage || 'EZOFIS Drive',
      structure:
        answers.structure ||
        RECOMMEND_FIELDS_VALUE,
      versioning: answers.versioning || 'Incremental Version',
    })
    setEditableFields(toEditableFields(suggestion.fields))
  }

  const generateDescription = async (folderName: string) => {
    setIsSending(true)
    try {
      const suggestion = await generateFolderConfig(
        `Create a repository folder named "${folderName}". Generate a concise enterprise business description for this folder based on its name and purpose. Also propose practical starter fields.`,
        messages.slice(-6).map((message) => ({
          role: message.role,
          text: message.text,
        })),
      )

      const description = suggestion.description.trim()
      setDraft((prev) => ({
        ...prev,
        description,
        folderName,
      }))
      setAiDescriptionGenerated(Boolean(description))

      pushAssistant(
        description
          ? `Description ready: “${description}” Review it below, then continue to Storage.`
          : `Folder “${folderName}” is ready. Continue to choose a storage provider.`,
        undefined,
        'details_ready',
        1,
      )

      if (suggestion.source === 'local') {
        showToast({
          message: 'Gemini unavailable — used local description fallback.',
          variant: 'warning',
        })
      }
    } catch (error: any) {
      const message =
        error?.message ||
        'Could not generate description. You can retry with another folder name.'
      showToast({ message, variant: 'error' })
      pushAssistant(
        `${message}`,
        [...NAME_CHIPS, ...EXAMPLE_PROMPTS],
        'name',
        1,
      )
    } finally {
      setIsSending(false)
    }
  }

  const generateFields = async (
    answers: DraftAnswers,
    structurePreference: string,
  ) => {
    setIsSending(true)
    try {
      const suggestion = await generateFolderConfig(
        [
          `Create a repository folder named "${answers.folderName}".`,
          answers.description
            ? `Business description: ${answers.description}.`
            : '',
          `Storage provider: ${answers.storage}.`,
          `Field / structure preference: ${structurePreference}.`,
          'Propose practical metadata fields for this folder.',
          'Set includeInFolderStructure true only for hierarchy fields.',
          'Return a short reply confirming the field recommendations.',
        ]
          .filter(Boolean)
          .join(' '),
        messages.slice(-8).map((message) => ({
          role: message.role,
          text: message.text,
        })),
      )

      const fields = toEditableFields(suggestion.fields)
      setEditableFields(fields)
      setAiFieldsGenerated(fields.length > 0)
      setDraft((prev) => ({
        ...prev,
        description: prev.description || suggestion.description,
        structure: structurePreference,
      }))
      if (!answers.description.trim() && suggestion.description.trim()) {
        setAiDescriptionGenerated(true)
      }

      pushAssistant(
        suggestion.reply ||
          `Recommended ${fields.length} fields for “${answers.folderName}”. Adjust them below, then continue.`,
        undefined,
        'fields_ready',
        3,
      )

      if (suggestion.source === 'local') {
        showToast({
          message: 'Gemini unavailable — used local fields fallback.',
          variant: 'warning',
        })
      }
    } catch (error: any) {
      const message =
        error?.message ||
        'Could not generate fields. Try Recommend fields again.'
      showToast({ message, variant: 'error' })
      pushAssistant(message, FIELD_CHIPS, 'fields', 3)
    } finally {
      setIsSending(false)
    }
  }

  const generateFullSetup = async (
    answers: DraftAnswers,
    freeformPrompt: string,
  ) => {
    setIsSending(true)
    setActiveStep(1)
    try {
      const suggestion = await generateFolderConfig(
        freeformPrompt,
        messages.slice(-10).map((message) => ({
          role: message.role,
          text: message.text,
        })),
      )
      applySuggestionToDraft(suggestion, {
        ...answers,
        description: suggestion.description,
        folderName: answers.folderName || suggestion.folderName,
        structure: freeformPrompt,
      })
      setAiDescriptionGenerated(Boolean(suggestion.description.trim()))
      setAiFieldsGenerated(suggestion.fields.length > 0)
      pushAssistant(
        suggestion.reply ||
          `Configuration for “${suggestion.folderName}” is ready. Review each step and continue through the remaining options.`,
        undefined,
        'details_ready',
        1,
      )
      if (suggestion.source === 'local') {
        showToast({
          message: 'Gemini unavailable — used local folder setup fallback.',
          variant: 'warning',
        })
      }
    } catch (error: any) {
      const message =
        error?.message ||
        'Could not generate folder configuration. Try again.'
      showToast({ message, variant: 'error' })
      pushAssistant(
        message,
        [...NAME_CHIPS, ...EXAMPLE_PROMPTS],
        'name',
        1,
      )
    } finally {
      setIsSending(false)
    }
  }

  const continueFromDetails = () => {
    if (!draft.folderName.trim() || !draft.description.trim()) return
    if (editingFromReview) {
      goToReview()
      return
    }
    pushAssistant(
      'Select the storage provider where documents for this folder should be stored.',
      STORAGE_CHIPS,
      'storage',
      2,
    )
  }

  const continueFromFields = () => {
    if (!editableFields.length) return
    if (editingFromReview) {
      goToReview()
      return
    }
    pushAssistant(
      'Which versioning strategy should apply when the same file is uploaded again?',
      VERSIONING_CHIPS,
      'versioning',
      4,
    )
  }

  const goToReview = () => {
    setEditingFromReview(false)
    setTypingId(null)
    setPhase('ready')
    setActiveStep(6)
    setInput('')
  }

  const editFromReview = (stepId: BuilderStepId) => {
    setEditingFromReview(true)
    setTypingId(null)
    setInput('')
    setActiveStep(stepId)

    if (stepId === 1) {
      setPhase('details_ready')
    } else if (stepId === 2) {
      pushAssistant(
        'Update the storage provider for this folder.',
        STORAGE_CHIPS,
        'storage',
        2,
      )
    } else if (stepId === 3) {
      if (editableFields.length) {
        setPhase('fields_ready')
      } else {
        pushAssistant(
          'How should documents be organized? Choose Recommend fields or another option.',
          FIELD_CHIPS,
          'fields',
          3,
        )
      }
    } else if (stepId === 4) {
      pushAssistant(
        'Update the versioning strategy for this folder.',
        VERSIONING_CHIPS,
        'versioning',
        4,
      )
    } else {
      pushAssistant(
        'Update the integration preference for this folder.',
        INTEGRATION_CHIPS,
        'integrations',
        5,
      )
    }

    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        stepNodeRefs.current[stepId]?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        })
      }, 80)
    })
  }

  const handleGuidedAnswer = async (rawValue: string) => {
    const value = rawValue.trim()
    if (!value || isSending) return

    if (value.startsWith('__prompt__:')) {
      const prompt = value.replace('__prompt__:', '').trim()
      if (!prompt) return
      setInput('')
      appendUser(prompt)
      await generateFullSetup(draft, prompt)
      return
    }

    if (phase === 'name') {
      const looksLikePrompt =
        value.length > 48 ||
        /\b(create|build|folder for|documents? for|invoices?|payslips?|contracts?)\b/i.test(
          value,
        )
      if (looksLikePrompt) {
        setInput('')
        appendUser(value)
        await generateFullSetup(draft, value)
        return
      }

      const folderName = value
      setDraft((prev) => ({ ...prev, folderName, description: '' }))
      setInput('')
      appendUser(folderName)
      pushAssistant(
        `Folder name recorded as “${folderName}”. Generating a business description now…`,
        undefined,
        'name',
        1,
      )
      await generateDescription(folderName)
      return
    }

    if (phase === 'storage') {
      const storage = value
      setDraft((prev) => ({ ...prev, storage }))
      setInput('')
      appendUser(storage)
      if (editingFromReview) {
        goToReview()
        return
      }
      pushAssistant(
        `${STORAGE_META[storage]?.label || storage} selected. How should documents be organized? Choose Recommend fields to generate a starter set.`,
        FIELD_CHIPS,
        'fields',
        3,
      )
      return
    }

    if (phase === 'fields') {
      const structure = value || RECOMMEND_FIELDS_VALUE
      setDraft((prev) => ({ ...prev, structure }))
      setInput('')
      appendUser(
        structure === RECOMMEND_FIELDS_VALUE
          ? 'Recommend fields'
          : structure,
      )
      pushAssistant(
        'Generating recommended fields for this folder…',
        undefined,
        'fields',
        3,
      )
      await generateFields(
        {
          ...draft,
          structure,
        },
        structure,
      )
      return
    }

    if (phase === 'versioning') {
      const versioning = value
      setDraft((prev) => ({ ...prev, versioning }))
      setInput('')
      appendUser(versioning)
      if (editingFromReview) {
        goToReview()
        return
      }
      pushAssistant(
        'Versioning strategy saved. Do you require an ERP or system integration, or should integrations be configured later?',
        INTEGRATION_CHIPS,
        'integrations',
        5,
      )
      return
    }

    if (phase === 'integrations') {
      const integrations = value || 'None'
      setDraft((prev) => ({ ...prev, integrations }))
      setInput('')
      appendUser(integrations)
      goToReview()
    }
  }

  const placeholderByPhase: Partial<Record<ChatPhase, string>> = {
    name: 'Enter folder name…',
    storage: 'Or type a storage provider…',
    fields: 'Describe structure or fields…',
    versioning: 'Or type a versioning strategy…',
    integrations: 'Or type an integration…',
  }

  const canSend =
    !isSending &&
    (phase === 'name' || phase === 'fields') &&
    Boolean(input.trim())

  const activeAssistant = [...messages]
    .reverse()
    .find((message) => message.role === 'assistant')

  const showActiveQuestion =
    Boolean(activeAssistant) &&
    typingId !== activeAssistant?.id &&
    !isSending

  const stepStatus = (
    stepId: BuilderStepId,
  ): 'active' | 'completed' | 'upcoming' => {
    if (editingFromReview) {
      return stepId === activeStep ? 'active' : 'completed'
    }
    if (phase === 'ready') {
      return stepId === 6 ? 'active' : 'completed'
    }
    if (completedSteps.has(stepId) && activeStep !== stepId) return 'completed'
    if (activeStep === stepId) return 'active'
    return 'upcoming'
  }

  const renderComposer = () => (
    <form
      className='space-y-2'
      onSubmit={(event) => {
        event.preventDefault()
        void handleGuidedAnswer(input)
      }}
    >
      <div className='relative rounded-[14px] border border-[var(--gray-3)] bg-[var(--gray-1)] transition focus-within:border-[var(--primary-7)] focus-within:bg-surface'>
        <textarea
          className='min-h-[52px] max-h-28 w-full resize-none rounded-[14px] bg-transparent py-3 pl-3.5 pr-12 text-[13px] text-[var(--gray-13)] outline-none'
          disabled={isSending}
          placeholder={
            placeholderByPhase[phase] || 'Type your answer…'
          }
          rows={2}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              void handleGuidedAnswer(input)
            }
          }}
        />
        <div className='absolute right-2 bottom-2'>
          <button
            aria-label='Send'
            className='flex size-8 items-center justify-center rounded-full bg-[var(--primary-9)] text-white transition hover:bg-[var(--primary-10)] disabled:opacity-40'
            disabled={!canSend}
            type='submit'
          >
            <Icon className='size-3.5' name='lucide:send' />
          </button>
        </div>
      </div>
    </form>
  )

  const renderActiveStepBody = (stepId: BuilderStepId) => {
    if (phaseToStep(phase) !== stepId) return null

    const questionMessage =
      activeAssistant &&
      (activeAssistant.stepId ?? phaseToStep(phase)) === stepId
        ? activeAssistant
        : null

    const iconGutter = 'pl-[28px]'

    return (
      <>
        {questionMessage ? (
          <div className='space-y-3'>
            <div className='flex items-start gap-2 text-[13px] leading-relaxed text-[var(--gray-12)]'>
              <span className='mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-3 text-primary-9'>
                <Icon className='size-3' name='lucide:bot' />
              </span>
              <div className='min-w-0 flex-1'>
                <TypewriterText
                  active={typingId === questionMessage.id}
                  text={questionMessage.text}
                  onDone={() => handleAssistantTypingDone(questionMessage.id)}
                />
              </div>
            </div>
          </div>
        ) : null}

        {isSending && stepId === activeStep ? (
          <div className={cn('flex items-center gap-2 text-[12px] font-medium text-primary-9', iconGutter)}>
            <SparkIconLoading size={16} />
            {stepId === 1
              ? 'Generating description…'
              : stepId === 3
                ? 'Generating recommended fields…'
                : 'Working…'}
          </div>
        ) : null}

        {phase === 'details_ready' && draft.folderName ? (
          <div className={cn('space-y-3 rounded-[12px] border border-primary-4 bg-primary-2 p-4', iconGutter)}>
            <p className='text-[11px] font-semibold uppercase tracking-[0.08em] text-primary-9'>
              Folder details
            </p>
            <div className='space-y-2'>
              <input
                className='w-full rounded-md border border-primary-4 bg-surface px-2.5 py-1.5 text-[14px] font-semibold text-[var(--gray-13)] outline-none focus:border-primary-9'
                value={draft.folderName}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    folderName: event.target.value,
                  }))
                }
              />
              <div className='flex items-start gap-1.5'>
                <textarea
                  className='min-h-[72px] min-w-0 flex-1 resize-none rounded-md border border-primary-4 bg-surface px-2.5 py-1.5 text-[12px] leading-relaxed text-[var(--gray-11)] outline-none focus:border-primary-9'
                  value={draft.description}
                  onChange={(event) => {
                    setAiDescriptionGenerated(false)
                    setDraft((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }}
                />
                {aiDescriptionGenerated ? (
                  <span
                    className='mt-1.5 inline-flex shrink-0 text-primary-9'
                    title='Generated by AI'
                  >
                    <AiBrandIcon className='size-3.5' />
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {phase === 'fields_ready' && editableFields.length > 0 ? (
          <div className={iconGutter}>
            <FieldsEditor
              fields={editableFields}
              onChange={setEditableFields}
            />
          </div>
        ) : null}

        {showActiveQuestion &&
        questionMessage?.chips?.length &&
        typingId !== questionMessage.id ? (
          <div className={iconGutter}>
            <SuggestionChipRow
              chips={questionMessage.chips}
              disabled={isSending}
              onSelect={(value) => void handleGuidedAnswer(value)}
            />
          </div>
        ) : null}

        {phase === 'details_ready' && !typingId && !isSending ? (
          <div className={cn('flex justify-end', iconGutter)}>
            <Button
              color='primary'
              icon={
                editingFromReview ? 'lucide:check' : 'lucide:arrow-right'
              }
              label={editingFromReview ? 'Done' : 'Continue'}
              onClick={continueFromDetails}
            />
          </div>
        ) : null}

        {phase === 'fields_ready' && !typingId && !isSending ? (
          <div className={cn('flex justify-end gap-2', iconGutter)}>
            {editingFromReview ? (
              <Button
                color='gray'
                label='Regenerate'
                variant='subtle'
                onClick={() => {
                  setPhase('fields')
                  pushAssistant(
                    'How should documents be organized? Choose Recommend fields or another option.',
                    FIELD_CHIPS,
                    'fields',
                    3,
                  )
                }}
              />
            ) : null}
            <Button
              color='primary'
              disabled={!editableFields.length}
              icon={
                editingFromReview ? 'lucide:check' : 'lucide:arrow-right'
              }
              label={editingFromReview ? 'Done' : 'Continue'}
              onClick={continueFromFields}
            />
          </div>
        ) : null}

        {(phase === 'name' || phase === 'fields') &&
        !typingId &&
        !isSending ? (
          <div className={iconGutter}>{renderComposer()}</div>
        ) : null}

        {editingFromReview &&
        (phase === 'storage' ||
          phase === 'versioning' ||
          phase === 'integrations' ||
          phase === 'fields') &&
        !isSending ? (
          <div className={cn('flex justify-end', iconGutter)}>
            <Button
              color='gray'
              label='Back to review'
              variant='subtle'
              onClick={goToReview}
            />
          </div>
        ) : null}
      </>
    )
  }

  const stepSummaries: Record<BuilderStepId, ReactNode> = {
    1: (
      <div className='space-y-1.5'>
        <p className='text-[13px] font-semibold text-[var(--gray-13)]'>
          {draft.folderName || 'Untitled folder'}
        </p>
        <div className='flex items-start gap-1.5'>
          <p className='min-w-0 flex-1 text-[12px] text-[var(--gray-10)]'>
            {draft.description.trim() || 'Description pending'}
          </p>
          {aiDescriptionGenerated ? (
            <span
              className='mt-0.5 inline-flex shrink-0 text-primary-9'
              title='Generated by AI'
            >
              <AiBrandIcon className='size-3.5' />
            </span>
          ) : null}
        </div>
      </div>
    ),
    2: draft.storage ? <StorageBadge storage={draft.storage} /> : null,
    3: (
      <p className='text-[12px] text-[var(--gray-11)]'>
        {editableFields.length
          ? `${editableFields.length} fields configured`
          : 'Fields pending'}
      </p>
    ),
    4: (
      <span className='rounded-full bg-[var(--gray-2)] px-2.5 py-1 text-[11px] font-medium text-[var(--gray-11)]'>
        {draft.versioning}
      </span>
    ),
    5: (
      <span className='rounded-full bg-[var(--gray-2)] px-2.5 py-1 text-[11px] font-medium text-[var(--gray-11)]'>
        {draft.integrations === 'None' || !draft.integrations
          ? 'No integrations'
          : draft.integrations}
      </span>
    ),
    6: (
      <div className='space-y-4'>
        <div className='flex items-start justify-between gap-3'>
          <div className='min-w-0 flex-1'>
            <p className='text-[11px] font-semibold uppercase tracking-[0.08em] text-primary-9'>
              Folder details
            </p>
            <p className='mt-1.5 text-[14px] font-semibold text-[var(--gray-13)]'>
              {draft.folderName}
            </p>
            <div className='mt-1 flex items-start gap-1.5'>
              <p className='min-w-0 flex-1 text-[12px] leading-relaxed text-[var(--gray-10)]'>
                {draft.description}
              </p>
              {aiDescriptionGenerated ? (
                <span
                  className='mt-0.5 inline-flex shrink-0 text-primary-9'
                  title='Generated by AI'
                >
                  <AiBrandIcon className='size-3.5' />
                </span>
              ) : null}
            </div>
          </div>
          <Button
            color='gray'
            icon='lucide:pencil'
            label='Edit'
            size='sm'
            variant='subtle'
            onClick={() => editFromReview(1)}
          />
        </div>

        <div className='flex items-start justify-between gap-3 border-t border-[var(--gray-3)] pt-4'>
          <div>
            <p className='text-[11px] font-semibold uppercase tracking-[0.08em] text-primary-9'>
              Storage
            </p>
            <div className='mt-2'>
              <StorageBadge storage={draft.storage} />
            </div>
          </div>
          <Button
            color='gray'
            icon='lucide:pencil'
            label='Edit'
            size='sm'
            variant='subtle'
            onClick={() => editFromReview(2)}
          />
        </div>

        <div className='flex items-start justify-between gap-3 border-t border-[var(--gray-3)] pt-4'>
          <div className='min-w-0 flex-1'>
            <div className='flex flex-wrap items-center gap-2'>
              <p className='text-[11px] font-semibold uppercase tracking-[0.08em] text-primary-9'>
                Fields ({editableFields.length})
              </p>
              {aiFieldsGenerated ? (
                <AiGeneratedBadge label='AI fields' />
              ) : null}
            </div>
            <div className='mt-2 space-y-3'>
              {editableFields.some((field) => field.includeInFolderStructure) ? (
                <div className='space-y-2'>
                  {editableFields
                    .filter((field) => field.includeInFolderStructure)
                    .map((field, index, folderList) => {
                      const visual = fieldVisual(true)
                      return (
                        <div
                          className='flex items-stretch'
                          key={field.id}
                        >
                          <FolderTreeLines
                            depth={index}
                            isLast={index === folderList.length - 1}
                          />
                          <div className='flex min-w-0 flex-1 items-start gap-2.5 rounded-[10px] border border-[var(--gray-3)] bg-[var(--gray-1)] px-3 py-2'>
                            <div
                              className={cn(
                                'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-[7px]',
                                visual.bg,
                                visual.color,
                              )}
                            >
                              <Icon className='size-3.5' name={visual.icon} />
                            </div>
                            <div className='min-w-0 flex-1'>
                              <div className='flex items-center gap-1.5'>
                                <p className='min-w-0 flex-1 truncate text-[13px] font-semibold text-[var(--gray-13)]'>
                                  {field.fieldName}
                                  {field.isMandatory ? (
                                    <span className='ml-1 text-[var(--red-10)]'>
                                      *
                                    </span>
                                  ) : null}
                                </p>
                                {field.aiGenerated ? (
                                  <span
                                    className='inline-flex shrink-0 text-primary-9'
                                    title='Generated by AI'
                                  >
                                    <AiBrandIcon className='size-3.5' />
                                  </span>
                                ) : null}
                              </div>
                              <p className='mt-0.5 text-[11px] text-[var(--gray-9)]'>
                                {formatDataTypeLabel(field.dataType)}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              ) : null}

              <div className='space-y-2'>
                {editableFields
                  .filter((field) => !field.includeInFolderStructure)
                  .map((field) => {
                    const visual = fieldVisual(false)
                    return (
                      <div
                        className='flex items-start gap-2.5 rounded-[10px] border border-[var(--gray-3)] bg-[var(--gray-1)] px-3 py-2'
                        key={field.id}
                      >
                        <div
                          className={cn(
                            'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-[7px]',
                            visual.bg,
                            visual.color,
                          )}
                        >
                          <Icon className='size-3.5' name={visual.icon} />
                        </div>
                        <div className='min-w-0 flex-1'>
                          <div className='flex items-center gap-1.5'>
                            <p className='min-w-0 flex-1 truncate text-[13px] font-semibold text-[var(--gray-13)]'>
                              {field.fieldName}
                              {field.isMandatory ? (
                                <span className='ml-1 text-[var(--red-10)]'>
                                  *
                                </span>
                              ) : null}
                            </p>
                            {field.aiGenerated ? (
                              <span
                                className='inline-flex shrink-0 text-primary-9'
                                title='Generated by AI'
                              >
                                <AiBrandIcon className='size-3.5' variant='curved-purple' />
                              </span>
                            ) : null}
                          </div>
                          <p className='mt-0.5 text-[11px] text-[var(--gray-9)]'>
                            {formatDataTypeLabel(field.dataType)}
                          </p>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          </div>
          <Button
            color='gray'
            icon='lucide:pencil'
            label='Edit'
            size='sm'
            variant='subtle'
            onClick={() => editFromReview(3)}
          />
        </div>

        <div className='flex items-start justify-between gap-3 border-t border-[var(--gray-3)] pt-4'>
          <div>
            <p className='text-[11px] font-semibold uppercase tracking-[0.08em] text-primary-9'>
              Versioning
            </p>
            <p className='mt-1.5 text-[13px] font-medium text-[var(--gray-12)]'>
              {draft.versioning}
            </p>
          </div>
          <Button
            color='gray'
            icon='lucide:pencil'
            label='Edit'
            size='sm'
            variant='subtle'
            onClick={() => editFromReview(4)}
          />
        </div>

        <div className='flex items-start justify-between gap-3 border-t border-[var(--gray-3)] pt-4'>
          <div>
            <p className='text-[11px] font-semibold uppercase tracking-[0.08em] text-primary-9'>
              Integrations
            </p>
            <p className='mt-1.5 text-[13px] font-medium text-[var(--gray-12)]'>
              {draft.integrations === 'None' || !draft.integrations
                ? 'No integrations'
                : draft.integrations}
            </p>
          </div>
          <Button
            color='gray'
            icon='lucide:pencil'
            label='Edit'
            size='sm'
            variant='subtle'
            onClick={() => editFromReview(5)}
          />
        </div>
      </div>
    ),
  }

  return (
    <div className='flex h-full min-h-0 flex-col bg-[var(--gray-1)]'>
      <div className='flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border-default)] bg-surface px-4 py-3'>
        <div className='flex min-w-0 items-center gap-2'>
          <IconButton
            ariaLabel='Back'
            color='gray'
            icon='lucide:arrow-left'
            size='md'
            variant='ghost'
            onClick={onBack}
          />
          <div className='min-w-0'>
            <h1 className='mb-0.5 truncate text-15 font-semibold text-[var(--gray-13)]'>
              AI Folder Builder
            </h1>
            <p className='truncate text-12 text-[var(--gray-9)]'>
              Complete each stage, then continue
            </p>
          </div>
        </div>
        <Button
          color='primary'
          disabled={!canApply}
          icon='lucide:check'
          label='Use this setup'
          onClick={() => {
            onApply({
              description: draft.description.trim(),
              fields: stripEditableIds(editableFields),
              folderName: draft.folderName,
              integrations: draft.integrations || 'None',
              storage: draft.storage || 'EZOFIS Drive',
              versioning: draft.versioning || 'Incremental Version',
            })
          }}
        />
      </div>

      <div className='min-h-0 flex-1 overflow-y-auto' ref={listRef}>
        <div className='mx-auto flex w-full max-w-[720px] flex-col px-4 py-8 sm:px-6'>
          {BUILDER_STEPS.map((item, index) => {
            const showAllFlow = phase === 'ready' || editingFromReview
            const visible = showAllFlow
              ? true
              : item.id <= unlockedStep
            if (!visible) return null

            const status = stepStatus(item.id)
            const nextStep = BUILDER_STEPS[index + 1]
            const nextVisible = nextStep
              ? showAllFlow || nextStep.id <= unlockedStep
              : false

            const isEditingThis =
              editingFromReview && item.id === activeStep

            let bottomConnectorState: TimelineConnectorState = 'hidden'
            if (nextVisible) {
              if (showAllFlow || completedSteps.has(item.id)) {
                bottomConnectorState = 'completed'
              } else {
                bottomConnectorState = 'idle'
              }
            }

            const prevStep = BUILDER_STEPS[index - 1]
            const prevVisible =
              index > 0 &&
              (showAllFlow || (prevStep && prevStep.id <= unlockedStep))

            let topConnectorState: TimelineConnectorState = 'hidden'
            if (prevVisible) {
              if (
                showAllFlow ||
                (prevStep && completedSteps.has(prevStep.id))
              ) {
                topConnectorState = 'completed'
              } else {
                topConnectorState = 'idle'
              }
            }

            return (
              <div
                key={item.id}
                ref={(node) => {
                  stepNodeRefs.current[item.id] = node
                }}
              >
                <BuilderTimelineStep
                  bottomConnectorState={bottomConnectorState}
                  description={item.description}
                  showTopConnector={index > 0}
                  status={status}
                  stepId={item.id}
                  summary={
                    status === 'completed' ||
                    (phase === 'ready' && item.id === 6)
                      ? stepSummaries[item.id]
                      : undefined
                  }
                  title={item.title}
                  topConnectorState={topConnectorState}
                >
                  {(status === 'active' || isEditingThis) &&
                  !(phase === 'ready' && item.id === 6)
                    ? renderActiveStepBody(item.id)
                    : null}
                </BuilderTimelineStep>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
