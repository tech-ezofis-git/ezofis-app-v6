import { useLingui } from '@lingui/react/macro'
import { Check } from 'lucide-react'
import { motion } from 'motion/react'
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { getActiveWizardDraft, saveWizardDraft } from '@/api/v6/wizardDrafts'
import GoogleDriveLogo from '@/assets/brands/googledrive.svg'
import OneDriveLogo from '@/assets/brands/onedrive.svg'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import InputCheckbox from '@/components/base/inputs/InputCheckbox'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputText from '@/components/base/inputs/InputText'
import SortableContainer, {
  type SortableReorderInfo,
} from '@/components/base/sortable/SortableContainer'
import SortableItem from '@/components/base/sortable/SortableItem'
import showToast from '@/components/base/toast/showToast'
import Tooltip from '@/components/base/Tooltip'
import AiBrandIcon from '@/components/common/AiBrandIcon'
import {
  type FolderConfigField,
  type FolderConfigSuggestion,
  generateFolderConfig,
  shortenDescription,
  shortenFolderName,
} from '@/services/ai/folderConfig'
import cn from '@/utils/cn'
import {
  buildFolderDraftJson,
  folderStepFromDraft,
  folderStepKey,
  hydrateFolderFromDraft,
} from '../../helpers/wizardDraftState'
import useSettingsTopbar from '../../hooks/useSettingsTopbar'
import {
  BuilderTimelineStep,
  type TimelineConnectorState,
} from './AiFolderBuilderTimeline'
import FolderFieldSettingsPanel from './FolderFieldSettingsPanel'

export type AiFolderBuilderApplyPayload = {
  description: string
  fields: FolderConfigField[]
  folderName: string
  integrations: string
  storage: string
  versioning: string
}

type AiFolderBuilderProps = {
  onApply: (payload: AiFolderBuilderApplyPayload) => void | Promise<void>
  onBack: () => void
  onBackToSettings?: () => void
}

type BuilderStepId = 1 | 2 | 3 | 4 | 5 | 6

type ChatMessage = {
  chips?: ChipOption[]
  id: string
  role: 'user' | 'assistant'
  stepId?: BuilderStepId
  text: string
}

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

type DraftAnswers = {
  description: string
  folderName: string
  integrations: string
  promptDescription: string
  storage: string
  structure: string
  versioning: string
}

type EditableField = FolderConfigField & {
  aiGenerated?: boolean
  id: string
  settings?: Record<string, any>
}

const RECOMMEND_FIELDS_VALUE =
  'Suggest the best metadata fields and folder structure for this folder'

function AiGeneratedBadge({ label }: { label?: string }) {
  const { t } = useLingui()
  const resolvedLabel = label ?? t`AI generated`
  return (
    <span className='inline-flex items-center gap-1 rounded-full border border-primary-4 bg-primary-3 px-2 py-0.5 text-[10px] font-semibold text-primary-9'>
      <AiSparkleIcon size={12} />
      {resolvedLabel}
    </span>
  )
}

function AiSparkleIcon({ size = 14 }: { size?: number }) {
  return (
    <AiBrandIcon
      className='shrink-0'
      style={{ height: size, width: size }}
      variant='outline-purple'
    />
  )
}

function fieldVisual(includeInFolderStructure: boolean) {
  if (includeInFolderStructure) {
    return {
      bg: 'bg-primary-3',
      color: 'text-primary-11',
      icon: 'lucide:folder',
    }
  }
  return {
    bg: 'bg-blue-3',
    color: 'text-blue-11',
    icon: 'lucide:file-text',
  }
}

function phaseToStep(phase: ChatPhase): BuilderStepId {
  if (phase === 'welcome' || phase === 'name' || phase === 'details_ready') {
    return 1
  }
  if (phase === 'fields' || phase === 'fields_ready') return 2
  if (phase === 'storage') return 3
  if (phase === 'versioning') return 4
  if (phase === 'integrations') return 5
  return 6
}

function SparkIconLoading({ size = 14 }: { size?: number }) {
  return (
    <motion.div
      className='inline-flex text-primary-9'
      transition={{ duration: 1.6, ease: 'easeInOut', repeat: Infinity }}
      animate={{
        opacity: [0.55, 1, 0.55],
        rotate: [0, 8, -8, 0],
        scale: [0.92, 1.12, 0.92],
      }}
    >
      <AiSparkleIcon size={size} />
    </motion.div>
  )
}

function StorageBadge({ storage }: { storage: string }) {
  const { t } = useLingui()
  const storageMeta: Record<
    string,
    { icon?: string; label: string; logo?: string }
  > = {
    'EZOFIS Drive': { label: t`EZOFIS Drive`, logo: '/favicon.svg' },
    'Google Drive': { label: t`Google Drive`, logo: GoogleDriveLogo },
    'One Drive': { label: t`OneDrive`, logo: OneDriveLogo },
  }
  const meta = storageMeta[storage]
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

function stripEditableIds(fields: EditableField[]): FolderConfigField[] {
  return fields.map(
    ({
      dataType,
      fieldName,
      iconKey,
      includeInFolderStructure,
      isMandatory,
      settings,
    }) => ({
      dataType,
      fieldName,
      iconKey,
      includeInFolderStructure,
      isMandatory,
      settings,
    }),
  )
}

function SuggestionChipRow({
  chips,
  disabled,
  onSelect,
  selectedValue,
}: {
  chips: ChipOption[]
  disabled?: boolean
  onSelect: (value: string) => void
  selectedValue?: string
}) {
  const { t } = useLingui()
  const [expanded, setExpanded] = useState(false)
  const maxVisible = 3
  const hasOverflow = chips.length > maxVisible
  const visibleChips = expanded ? chips : chips.slice(0, maxVisible)
  const hiddenCount = chips.length - maxVisible

  return (
    <div className='flex max-w-full flex-wrap items-center gap-2'>
      {visibleChips.map((chip) => {
        const isSelected = Boolean(
          selectedValue &&
            (chip.value.toLowerCase() === selectedValue.toLowerCase() ||
              chip.label.toLowerCase() === selectedValue.toLowerCase()),
        )
        return (
          <button
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[12px] font-semibold whitespace-nowrap transition disabled:opacity-50',
              isSelected
                ? 'border-2 border-primary-9 bg-primary-1 text-primary-9 shadow-xs'
                : 'border border-primary-4 bg-surface text-primary-11 hover:border-primary-9 hover:bg-primary-2 hover:text-primary-9',
            )}
            disabled={disabled}
            key={chip.value}
            type='button'
            onClick={() => onSelect(chip.value)}
          >
            {chip.logo ? (
              <img alt='' className='size-3.5 object-contain' src={chip.logo} />
            ) : null}
            {chip.icon ? (
              <Icon
                className='size-3.5 text-primary-9'
                name={chip.icon}
              />
            ) : null}
            {isSelected ? (
              <Check className='size-3.5 stroke-[3] text-primary-9' />
            ) : null}
            {chip.label}
          </button>
        )
      })}

      {hasOverflow && !expanded ? (
        <button
          className='inline-flex items-center rounded-full border border-primary-5 bg-surface px-3.5 py-2 text-[12px] font-semibold whitespace-nowrap text-primary-9 transition hover:bg-primary-2 disabled:opacity-50'
          disabled={disabled}
          type='button'
          onClick={() => setExpanded(true)}
        >
          {t`More (+${hiddenCount})`}
        </button>
      ) : null}

      {hasOverflow && expanded ? (
        <button
          className='inline-flex items-center rounded-full border border-primary-5 bg-surface px-3.5 py-2 text-[12px] font-semibold whitespace-nowrap text-primary-9 transition hover:bg-primary-2 disabled:opacity-50'
          disabled={disabled}
          type='button'
          onClick={() => setExpanded(false)}
        >
          {t`Less`}
        </button>
      ) : null}
    </div>
  )
}

function toEditableFields(fields: FolderConfigField[]): EditableField[] {
  return sortFieldsByType(
    fields.map((field) => ({
      ...field,
      aiGenerated: true,
      id: crypto.randomUUID(),
    })),
  )
}

function TypewriterText({
  active,
  speed = 12,
  text,
  onDone,
}: {
  active: boolean
  speed?: number
  text: string
  onDone?: () => void
}) {
  const [shown, setShown] = useState(() => (active ? '' : text))
  const doneRef = useRef(false)

  useEffect(() => {
    if (!active) {
      setShown(text)
      if (!doneRef.current) {
        doneRef.current = true
        onDone?.()
      }
      return
    }

    setShown('')
    doneRef.current = false
    let idx = 0
    const timer = setInterval(() => {
      idx++
      setShown(text.slice(0, idx))
      if (idx >= text.length) {
        clearInterval(timer)
        if (!doneRef.current) {
          doneRef.current = true
          onDone?.()
        }
      }
    }, speed)

    return () => clearInterval(timer)
  }, [text, active, speed, onDone])

  return (
    <span>
      {shown}
      {active && shown.length < text.length ? (
        <span className='ml-0.5 inline-block h-[1em] w-[2px] animate-pulse bg-[var(--primary-9)] align-[-2px]' />
      ) : null}
    </span>
  )
}

/** Same datatype control as repository field configuration. */
const FIELD_DATA_TYPES = [
  { icon: 'lucide:type', id: 'SHORT_TEXT', name: 'Short Text' },
  { icon: 'tabler:align-left', id: 'LONG_TEXT', name: 'Long Text' },
  { icon: 'tabler:numbers', id: 'NUMBER', name: 'Number' },
  { icon: 'tabler:toggle-left', id: 'BOOLEAN', name: 'Boolean' },
  { icon: 'tabler:calendar', id: 'DATE', name: 'Date' },
  { icon: 'tabler:clock-hour-4', id: 'TIME', name: 'Time' },
  { icon: 'tabler:clock', id: 'DATE_TIME', name: 'Date & Time' },
  { icon: 'tabler:list', id: 'SINGLE_SELECT', name: 'Single Select' },
  { icon: 'tabler:table', id: 'TABLE', name: 'Table' },
  { icon: 'tabler:barcode', id: 'BARCODE', name: 'Barcode' },
  { icon: 'tabler:circles', id: 'OMR', name: 'OMR' },
  { icon: 'tabler:math-function', id: 'CALCULATED', name: 'Calculated' },
  { icon: 'tabler:wand', id: 'AUTO_GENERATED', name: 'Auto Generated' },
  { icon: 'tabler:link', id: 'LINK', name: 'Link' },
  {
    icon: 'tabler:currency-dollar',
    id: 'CURRENCY_AMOUNT',
    name: 'Currency Amount',
  },
  { icon: 'tabler:table-options', id: 'DYNAMIC_TABLE', name: 'Dynamic Table' },
] as const

const formatDataTypeLabel = (value: string) => {
  const match = FIELD_DATA_TYPES.find((type) => type.id === value)
  if (match) return match.name
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function sortFieldsByType(fields: EditableField[]): EditableField[] {
  const folderFields = fields.filter((field) => field.includeInFolderStructure)
  const normalFields = fields.filter((field) => !field.includeInFolderStructure)
  return [...folderFields, ...normalFields]
}

const FOLDER_TREE_STEP = 22

type EditFieldForm = {
  dataType: string
  fieldName: string
  iconKey?: string
  id: string
  includeInFolderStructure: boolean
  isMandatory: boolean
  settings?: Record<string, any>
}

function FieldsEditor({
  fields,
  onChange,
  onUserToggledRequired,
  hasToggledRequired: _hasToggledRequired = false,
}: {
  fields: EditableField[]
  onChange: (fields: EditableField[]) => void
  onUserToggledRequired?: () => void
  hasToggledRequired?: boolean
}) {
  const { t } = useLingui()
  const [newFieldName, setNewFieldName] = useState('')
  const [newDataType, setNewDataType] = useState('SHORT_TEXT')
  const [newIsMandatory, setNewIsMandatory] = useState(false)
  const [newIsFolder, setNewIsFolder] = useState(false)
  const [newFieldSettings, setNewFieldSettings] = useState<Record<string, any>>({})
  const [isAddingField, setIsAddingField] = useState(false)

  const [editingFieldId, setEditingFieldId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditFieldForm | null>(null)

  const fieldTypeOptions = useMemo(
    () =>
      FIELD_DATA_TYPES.map((type) => ({
        id: type.id,
        name: type.name,
      })),
    [],
  )

  const folderFields = fields.filter((field) => field.includeInFolderStructure)
  const metadataFields = fields.filter(
    (field) => !field.includeInFolderStructure,
  )

  const handleReorder = (ids: string[], info?: SortableReorderInfo) => {
    const map = new Map(fields.map((field) => [field.id, { ...field }]))

    let activeId = info?.activeId
    let overId = info?.overId
    let newIndex = info?.newIndex ?? -1

    if (!activeId || !overId) {
      const prevIds = [
        ...folderFields.map((f) => f.id),
        ...metadataFields.map((f) => f.id),
      ]
      for (let i = 0; i < ids.length; i++) {
        if (ids[i] !== prevIds[i]) {
          activeId = ids[i]
          newIndex = i
          overId = prevIds[i]
          break
        }
      }
    }

    const activeField = activeId ? map.get(activeId) : undefined
    const overField = overId ? map.get(overId) : undefined

    if (activeField) {
      const numFolders = folderFields.length
      const wasFolder = Boolean(activeField.includeInFolderStructure)

      if (!wasFolder) {
        // Active item was a metadata field in the Free Section.
        // If dropped onto a folder field or into the folder range, convert to folder.
        const droppedIntoFolders =
          Boolean(overField?.includeInFolderStructure) ||
          (newIndex >= 0 && newIndex < numFolders)

        if (droppedIntoFolders) {
          activeField.includeInFolderStructure = true
          activeField.isMandatory = true
          activeField.iconKey = 'folder'
        }
      } else {
        // Active item was a folder field in the Nested Folder Hierarchy.
        // If dragged outside into the free section, convert to regular document field.
        const draggedOutside =
          (overField && !overField.includeInFolderStructure) ||
          (newIndex >= numFolders - 1 && overField?.id !== activeField.id)

        if (draggedOutside) {
          activeField.includeInFolderStructure = false
          activeField.iconKey = 'document'
        }
      }
    }

    const reordered = ids.map((id) => map.get(id)!).filter(Boolean)
    onChange(sortFieldsByType(reordered))
  }

  const updateField = (id: string, patch: Partial<EditableField>) => {
    if ('isMandatory' in patch) {
      onUserToggledRequired?.()
    }
    const next = fields.map((field) => {
      if (field.id !== id) return field
      const updated = { ...field, ...patch }
      if ('includeInFolderStructure' in patch) {
        if (patch.includeInFolderStructure) {
          updated.isMandatory = true
          updated.iconKey = 'folder'
        } else {
          updated.iconKey = 'document'
        }
      }
      return updated
    })
    onChange(
      'includeInFolderStructure' in patch ? sortFieldsByType(next) : next,
    )
  }

  const removeField = (id: string) => {
    if (editingFieldId === id) {
      setEditingFieldId(null)
      setEditForm(null)
    }
    onChange(fields.filter((field) => field.id !== id))
  }

  const startEditingField = (field: EditableField) => {
    setIsAddingField(false)
    setEditingFieldId(field.id)
    setEditForm({
      dataType: field.dataType,
      fieldName: field.fieldName,
      iconKey:
        field.iconKey ||
        (field.includeInFolderStructure ? 'folder' : 'document'),
      id: field.id,
      includeInFolderStructure: Boolean(field.includeInFolderStructure),
      isMandatory: Boolean(
        field.includeInFolderStructure || field.isMandatory,
      ),
      settings: field.settings ? { ...field.settings } : {},
    })
  }

  const cancelEditingField = () => {
    setEditingFieldId(null)
    setEditForm(null)
  }

  const saveEditingField = () => {
    if (!editForm) return
    const trimmed = editForm.fieldName.trim()
    if (!trimmed) {
      showToast({ message: t`Please enter a field name.`, variant: 'info' })
      return
    }

    updateField(editForm.id, {
      dataType: editForm.dataType,
      fieldName: trimmed,
      iconKey: editForm.iconKey,
      includeInFolderStructure: editForm.includeInFolderStructure,
      isMandatory: editForm.includeInFolderStructure
        ? true
        : editForm.isMandatory,
      settings: editForm.settings,
    })

    cancelEditingField()
  }

  const addField = () => {
    const name = newFieldName.trim()
    if (!name) {
      showToast({ message: t`Please enter a field name.`, variant: 'info' })
      return
    }

    onChange(
      sortFieldsByType([
        ...fields,
        {
          aiGenerated: false,
          dataType: newDataType,
          fieldName: name,
          iconKey: newIsFolder ? 'folder' : 'document',
          id: crypto.randomUUID(),
          includeInFolderStructure: newIsFolder,
          isMandatory: newIsFolder || newIsMandatory,
          settings: newFieldSettings,
        },
      ]),
    )

    setNewFieldName('')
    setNewDataType('SHORT_TEXT')
    setNewIsMandatory(false)
    setNewIsFolder(false)
    setNewFieldSettings({})
    setIsAddingField(false)
  }

  const renderEditFieldCard = () => {
    if (!editForm) return null

    return (
      <div className='animate-in fade-in slide-in-from-top-1 rounded-xl border border-primary-5/80 bg-surface p-4 shadow-sm duration-200'>
        <div className='flex flex-col gap-3.5'>
          {/* Header */}
          <div className='flex items-center justify-between border-b border-gray-3 pb-2.5'>
            <div className='flex items-center gap-2'>
              <span className='flex size-6 items-center justify-center rounded-md bg-primary-3 text-primary-11'>
                <Icon className='size-3.5' name='lucide:edit-3' />
              </span>
              <span className='text-13 font-semibold text-gray-12'>
                {t`Edit Field`}
              </span>
            </div>
            <button
              aria-label={t`Cancel edit`}
              className='flex size-6 items-center justify-center rounded-md text-gray-8 transition hover:bg-gray-3 hover:text-gray-12'
              type='button'
              onClick={cancelEditingField}
            >
              <Icon className='size-3.5' name='lucide:x' />
            </button>
          </div>

          {/* 2 Inputs: Field Name & Type */}
          <div className='grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_180px]'>
            <div>
              <InputText
                autoFocus
                label={t`Field Name`}
                placeholder={t`e.g. Cost Center`}
                value={editForm.fieldName}
                onChange={(val) =>
                  setEditForm((prev) =>
                    prev ? { ...prev, fieldName: val } : null,
                  )
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    saveEditingField()
                  } else if (e.key === 'Escape') {
                    cancelEditingField()
                  }
                }}
              />
            </div>

            <div>
              <InputSelect
                label={t`Type`}
                options={fieldTypeOptions}
                searchPlaceholder={t`Search type`}
                searchable
                width='target'
                value={
                  fieldTypeOptions.find(
                    (opt) => opt.id === editForm.dataType,
                  ) || fieldTypeOptions[0]
                }
                onChange={(selected) => {
                  if (!selected) return
                  setEditForm((prev) =>
                    prev ? { ...prev, dataType: String(selected.id) } : null,
                  )
                }}
              />
            </div>
          </div>

          {/* Advanced Settings if Table, Dropdown, Link, Barcode, etc. */}
          {[
            'TABLE',
            'SINGLE_SELECT',
            'MULTI_SELECT',
            'MULTIPLE_CHOICE',
            'SINGLE_CHOICE',
            'LINK',
            'URL',
            'OMR',
            'BARCODE',
          ].includes(editForm.dataType) && (
            <div className='w-full'>
              <FolderFieldSettingsPanel
                field={
                  {
                    dataType: editForm.dataType,
                    fieldName: editForm.fieldName || t`Field`,
                    id: editForm.id,
                    settings: editForm.settings || {},
                  } as any
                }
                onClose={() => {}}
                onUpdate={(patch) => {
                  if (patch.settings) {
                    setEditForm((prev) =>
                      prev
                        ? {
                            ...prev,
                            settings: { ...prev.settings, ...patch.settings },
                          }
                        : null,
                    )
                  }
                }}
              />
            </div>
          )}

          {/* 2 Checkboxes & Save Field Button */}
          <div className='flex flex-wrap items-center justify-between gap-3 pt-1'>
            <div className='flex items-center gap-5'>
              <label className='flex cursor-pointer items-center gap-2 text-13 font-medium text-gray-12'>
                <InputCheckbox
                  checked={editForm.includeInFolderStructure}
                  onChange={(checked) => {
                    const isFolder = Boolean(checked)
                    setEditForm((prev) =>
                      prev
                        ? {
                            ...prev,
                            iconKey: isFolder ? 'folder' : 'document',
                            includeInFolderStructure: isFolder,
                            isMandatory: isFolder ? true : prev.isMandatory,
                          }
                        : null,
                    )
                  }}
                />
                {t`Folder`}
              </label>

              <label className='flex cursor-pointer items-center gap-2 text-13 font-medium text-gray-12'>
                <InputCheckbox
                  checked={
                    editForm.includeInFolderStructure || editForm.isMandatory
                  }
                  disabled={editForm.includeInFolderStructure}
                  onChange={(checked) => {
                    setEditForm((prev) =>
                      prev ? { ...prev, isMandatory: Boolean(checked) } : null,
                    )
                  }}
                />
                {t`Mandatory`}
              </label>
            </div>

            <div className='flex items-center gap-2'>
              <Button
                size='sm'
                variant='ghost'
                label={t`Cancel`}
                onClick={cancelEditingField}
              />
              <Button
                color='primary'
                size='sm'
                icon='lucide:check'
                label={t`Save Field`}
                onClick={saveEditingField}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderAddFieldSection = () => {
    if (!isAddingField) {
      return (
        <button
          type='button'
          className='flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-gray-4 bg-gray-1/60 py-2.5 text-13 font-medium text-gray-11 transition hover:border-primary-6 hover:bg-primary-1/30 hover:text-primary-11'
          onClick={() => {
            setIsAddingField(true)
            cancelEditingField()
          }}
        >
          <Icon className='size-4' name='lucide:plus' />
          {t`Add Field`}
        </button>
      )
    }

    return (
      <div className='animate-in fade-in slide-in-from-top-1 rounded-xl border border-gray-3 bg-surface p-4 shadow-sm duration-200'>
        <div className='flex flex-col gap-3.5'>
          {/* Header */}
          <div className='flex items-center justify-between border-b border-gray-3 pb-2.5'>
            <div className='flex items-center gap-2'>
              <span className='flex size-6 items-center justify-center rounded-md bg-primary-3 text-primary-11'>
                <Icon className='size-3.5' name='lucide:plus' />
              </span>
              <span className='text-13 font-semibold text-gray-12'>
                {t`New Field`}
              </span>
            </div>
            <button
              aria-label={t`Cancel`}
              className='flex size-6 items-center justify-center rounded-md text-gray-8 transition hover:bg-gray-3 hover:text-gray-12'
              type='button'
              onClick={() => setIsAddingField(false)}
            >
              <Icon className='size-3.5' name='lucide:x' />
            </button>
          </div>

          {/* 2 Inputs: Field Name & Type */}
          <div className='grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_180px]'>
            <div>
              <InputText
                autoFocus
                label={t`Field Name`}
                placeholder={t`e.g. Cost Center`}
                value={newFieldName}
                onChange={setNewFieldName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addField()
                  } else if (e.key === 'Escape') {
                    setIsAddingField(false)
                  }
                }}
              />
            </div>

            <div>
              <InputSelect
                label={t`Type`}
                options={fieldTypeOptions}
                searchPlaceholder={t`Search type`}
                searchable
                width='target'
                value={
                  fieldTypeOptions.find((opt) => opt.id === newDataType) ||
                  fieldTypeOptions[0]
                }
                onChange={(selected) => {
                  if (!selected) return
                  setNewDataType(String(selected.id))
                }}
              />
            </div>
          </div>

          {/* Advanced Settings if Table, Dropdown, Link, Barcode, etc. */}
          {[
            'TABLE',
            'SINGLE_SELECT',
            'MULTI_SELECT',
            'MULTIPLE_CHOICE',
            'SINGLE_CHOICE',
            'LINK',
            'URL',
            'OMR',
            'BARCODE',
          ].includes(newDataType) && (
            <div className='w-full'>
              <FolderFieldSettingsPanel
                field={
                  {
                    dataType: newDataType,
                    fieldName: newFieldName || t`Field`,
                    id: 'new-field',
                    settings: newFieldSettings,
                  } as any
                }
                onClose={() => {}}
                onUpdate={(patch) => {
                  if (patch.settings) {
                    setNewFieldSettings((prev) => ({
                      ...prev,
                      ...patch.settings,
                    }))
                  }
                }}
              />
            </div>
          )}

          {/* 2 Checkboxes & Add Field Button */}
          <div className='flex flex-wrap items-center justify-between gap-3 pt-1'>
            <div className='flex items-center gap-5'>
              <label className='flex cursor-pointer items-center gap-2 text-13 font-medium text-gray-12'>
                <InputCheckbox
                  checked={newIsFolder}
                  onChange={(checked) => {
                    const isFolder = Boolean(checked)
                    setNewIsFolder(isFolder)
                    if (isFolder) setNewIsMandatory(true)
                  }}
                />
                {t`Folder`}
              </label>

              <label className='flex cursor-pointer items-center gap-2 text-13 font-medium text-gray-12'>
                <InputCheckbox
                  checked={newIsFolder || newIsMandatory}
                  disabled={newIsFolder}
                  onChange={(checked) => setNewIsMandatory(Boolean(checked))}
                />
                {t`Mandatory`}
              </label>
            </div>

            <div className='flex items-center gap-2'>
              <Button
                size='sm'
                variant='ghost'
                label={t`Cancel`}
                onClick={() => setIsAddingField(false)}
              />
              <Button
                color='primary'
                size='sm'
                icon='lucide:plus'
                label={t`Add Field`}
                onClick={addField}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderFieldRow = (
    field: EditableField,
    options?: {
      depth?: number
      isFirstField?: boolean
      isLast?: boolean
      showTree?: boolean
    },
  ) => {
    const visual = fieldVisual(field.includeInFolderStructure)
    const showTree = options?.showTree ?? false
    const depth = options?.depth ?? 0
    const isEditingThisField = editingFieldId === field.id

    if (isEditingThisField) {
      return (
        <div
          className={cn('flex items-stretch', showTree ? 'gap-0' : undefined)}
          key={field.id}
        >
          {showTree ? (
            <FolderTreeLines depth={depth} isLast={options?.isLast ?? true} />
          ) : null}
          <div className='min-w-0 flex-1'>{renderEditFieldCard()}</div>
        </div>
      )
    }

    const isMandatory = Boolean(
      field.includeInFolderStructure || field.isMandatory,
    )

    return (
      <div
        className={cn('flex items-stretch', showTree ? 'gap-0' : undefined)}
        key={field.id}
      >
        {showTree ? (
          <FolderTreeLines depth={depth} isLast={options?.isLast ?? true} />
        ) : null}
        <div className='flex min-w-0 flex-1 flex-col gap-1'>
          <SortableItem
            className='relative flex w-full items-center gap-2 rounded-[10px] border border-gray-3 bg-surface-primary py-1.5 pr-2.5 pl-1.5 transition-colors hover:border-gray-4'
            handlerClassName='size-6 text-gray-8 hover:text-gray-11'
            handlerPosition='before'
            id={field.id}
            trailing={
              <div className='ml-auto flex shrink-0 items-center gap-1.5'>
                {/* Type Badge */}
                <span className='rounded bg-gray-2 px-1.5 py-0.5 text-[11px] font-medium text-gray-10 select-none whitespace-nowrap'>
                  {formatDataTypeLabel(field.dataType)}
                </span>

                {/* Edit Button */}
                <Tooltip content={t`Edit field`} position='top'>
                  <button
                    aria-label={t`Edit ${field.fieldName}`}
                    className='flex size-6.5 shrink-0 items-center justify-center rounded text-gray-9 transition hover:bg-gray-3 hover:text-gray-12'
                    type='button'
                    onClick={() => startEditingField(field)}
                  >
                    <Icon className='size-3.5' name='lucide:pencil' />
                  </button>
                </Tooltip>

                {/* Delete Button */}
                <Tooltip content={t`Remove field`} position='top'>
                  <button
                    aria-label={t`Remove ${field.fieldName}`}
                    className='flex size-6.5 shrink-0 items-center justify-center rounded text-gray-9 transition hover:bg-red-3 hover:text-red-11'
                    type='button'
                    onClick={() => removeField(field.id)}
                  >
                    <Icon className='size-3.5' name='lucide:trash-2' />
                  </button>
                </Tooltip>
              </div>
            }
          >
            {field.aiGenerated ? (
              <span
                className='absolute -top-1.5 -right-1.5 z-10 flex size-4.5 items-center justify-center rounded-full border border-primary-4 bg-primary-2 text-primary-9 shadow-xs'
                title={t`Generated by AI`}
              >
                <AiBrandIcon
                  className='size-2.5 shrink-0'
                  variant='outline-purple'
                />
              </span>
            ) : null}

            {/* Folder vs Document Icon Indicator */}
            <Tooltip
              content={
                field.includeInFolderStructure
                  ? t`Folder hierarchy field`
                  : t`Document field`
              }
              position='top'
            >
              <div
                className={cn(
                  'flex size-6.5 shrink-0 items-center justify-center rounded-[6px] transition',
                  visual.bg,
                  visual.color,
                )}
              >
                <Icon className='size-3.5' name={visual.icon} />
              </div>
            </Tooltip>

            {/* Field Name button & Mandatory Icon next to text */}
            <div className='flex min-w-0 items-center gap-1'>
              <button
                className='truncate text-left text-13 font-semibold text-gray-12 transition-colors hover:text-primary-10'
                type='button'
                title={t`Click to edit field`}
                onClick={() => startEditingField(field)}
              >
                {field.fieldName || t`Untitled`}
              </button>

              {isMandatory ? (
                <Tooltip
                  content={
                    field.includeInFolderStructure
                      ? t`Required for folder hierarchy`
                      : t`Required field`
                  }
                  position='top'
                >
                  <span
                    aria-label={t`Required`}
                    className='flex size-4 shrink-0 items-center justify-center text-[15px] leading-none font-bold text-red-10 select-none'
                  >
                    *
                  </span>
                </Tooltip>
              ) : null}
            </div>
          </SortableItem>
        </div>
      </div>
    )
  }

  const sortableItemIds = useMemo(() => {
    return [
      ...folderFields.map((f) => f.id),
      ...metadataFields.map((f) => f.id),
    ]
  }, [folderFields, metadataFields])

  return (
    <div className='space-y-3'>
      {/* Column header */}
      <div className='flex items-center justify-between px-2.5 text-[11px] font-medium text-gray-9'>
        <span>{t`Field name`}</span>
        <span className='text-right'>{t`Type · Actions`}</span>
      </div>

      <SortableContainer
        constrainToParent={false}
        items={sortableItemIds}
        onItemsChange={handleReorder}
      >
        <div className='space-y-2'>
          {folderFields.map((field, index) =>
            renderFieldRow(field, {
              depth: index,
              isFirstField: index === 0,
              isLast: index === folderFields.length - 1,
              showTree: true,
            }),
          )}
          {metadataFields.map((field, index) =>
            renderFieldRow(field, {
              isFirstField: folderFields.length === 0 && index === 0,
            }),
          )}
        </div>
      </SortableContainer>

      {/* Add Field Section */}
      {renderAddFieldSection()}
    </div>
  )
}

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

const emptyDraft = (): DraftAnswers => ({
  description: '',
  folderName: '',
  integrations: '',
  promptDescription: '',
  storage: '',
  structure: '',
  versioning: '',
})

export default function AiFolderBuilder({
  onApply,
  onBack,
  onBackToSettings,
}: AiFolderBuilderProps) {
  const { t } = useLingui()
  const initialGreetingId = useMemo(() => crypto.randomUUID(), [])
  const folderDraftIdRef = useRef<string | null>(null)
  const persistReadyRef = useRef(false)
  const skipNextPersistRef = useRef(false)

  const handleBack = useCallback(() => {
    onBack()
  }, [onBack])

  const breadcrumbConfig = useMemo(
    () => ({
      items: [
        { key: 'settings', label: t`Settings` },
        { key: 'folder-configuration', label: t`Folder Configuration` },
        { label: t`AI Folder Builder` },
      ],
      onNavigate: (key: string) => {
        if (key === 'settings') {
          if (onBackToSettings) {
            onBackToSettings()
          } else {
            onBack()
          }
        } else if (key === 'folder-configuration') {
          onBack()
        }
      },
    }),
    [onBack, onBackToSettings],
  )

  useSettingsTopbar(breadcrumbConfig)

  const builderSteps = useMemo(
    () => [
      {
        description: t`Set the folder name and let AI draft a clear business description for this folder.`,
        id: 1 as BuilderStepId,
        title: t`Folder Details`,
      },
      {
        description: (
          <div className='space-y-1.5'>
            <span>
              {t`Define metadata fields used for search, filtering, and folder structure.`}
            </span>
            <div className='flex items-center gap-1.5 text-[11px] text-gray-9'>
              <Icon className='size-3 shrink-0 text-gray-8' name='lucide:info' />
              <span>
                {t`Fields marked with an asterisk (*) are mandatory. Edit a field to configure mandatory or folder hierarchy.`}
              </span>
            </div>
          </div>
        ),
        id: 2 as BuilderStepId,
        title: t`Fields`,
      },
      {
        description: t`Choose where documents in this folder will be stored and accessed.`,
        id: 3 as BuilderStepId,
        title: t`Storage`,
      },
      {
        description: t`Decide how document revisions are tracked when files are updated.`,
        id: 4 as BuilderStepId,
        title: t`Versioning`,
      },
      {
        description: t`Optionally connect ERP or other systems so data can sync with this folder.`,
        id: 5 as BuilderStepId,
        title: t`Integrations`,
      },
      {
        description: t`Review your full folder setup, then apply it to create the folder.`,
        id: 6 as BuilderStepId,
        title: t`Review`,
      },
    ],
    [t],
  )

  const storageChips = useMemo<ChipOption[]>(
    () => [
      { label: t`EZOFIS Drive`, logo: '/favicon.svg', value: 'EZOFIS Drive' },
      { label: t`OneDrive`, logo: OneDriveLogo, value: 'One Drive' },
      { label: t`Google Drive`, logo: GoogleDriveLogo, value: 'Google Drive' },
    ],
    [t],
  )

  const fieldChips = useMemo<ChipOption[]>(
    () => [
      {
        icon: 'tabler:sparkles',
        label: t`Recommend fields`,
        value: RECOMMEND_FIELDS_VALUE,
      },
      {
        label: t`By supplier / vendor`,
        value: 'Organize by supplier or vendor, then document type',
      },
      {
        label: t`By employee`,
        value: 'Organize by employee, then document type',
      },
      {
        label: t`By document type`,
        value: 'Organize primarily by document type',
      },
      {
        label: t`By customer`,
        value: 'Organize by customer, then document type',
      },
    ],
    [t],
  )

  const versioningChips = useMemo<ChipOption[]>(
    () => [
      { label: t`Incremental Version`, value: 'Incremental Version' },
      { label: t`Timestamp Version`, value: 'Timestamp Version' },
      { label: t`Replace Existing`, value: 'Replace Existing' },
    ],
    [t],
  )

  const integrationChips = useMemo<ChipOption[]>(
    () => [
      { label: t`No integrations`, value: 'None' },
      { label: 'SAP', value: 'SAP' },
      { label: t`Oracle ERP`, value: 'Oracle ERP' },
      { label: t`Microsoft Dynamics`, value: 'Microsoft Dynamics' },
      { label: 'QuickBooks', value: 'QuickBooks' },
      { label: t`Custom API`, value: 'Custom API' },
    ],
    [t],
  )

  const storageMeta = useMemo(
    () => ({
      'EZOFIS Drive': { label: t`EZOFIS Drive`, logo: '/favicon.svg' },
      'Google Drive': { label: t`Google Drive`, logo: GoogleDriveLogo },
      'One Drive': { label: t`OneDrive`, logo: OneDriveLogo },
    }),
    [t],
  )

  const nameChips = useMemo<ChipOption[]>(
    () => [
      { label: t`Accounts Payable`, value: 'Accounts Payable' },
      { label: t`Accounts Receivable`, value: 'Accounts Receivable' },
      { label: t`HR Documents`, value: 'HR Documents' },
      { label: t`Legal Contracts`, value: 'Legal Contracts' },
    ],
    [t],
  )

  const examplePrompts = useMemo<ChipOption[]>(
    () => [
      {
        label: t`HR payslips folder`,
        value:
          '__prompt__:Create an HR folder for payslips and employee documents',
      },
      {
        label: t`Legal contracts folder`,
        value:
          '__prompt__:Create a Legal folder for contracts and compliance documents',
      },
      {
        label: t`Accounts payable folder`,
        value:
          '__prompt__:Create an Accounts Payable folder for invoices, POs, and vendor bills',
      },
    ],
    [t],
  )

  const nameQuestion = t`To begin: what should this folder be named? Use a clear business name, choose an example below, or describe a full folder idea to generate a complete setup.`

  const [phase, setPhase] = useState<ChatPhase>('name')
  const [activeStep, setActiveStep] = useState<BuilderStepId>(1)
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isSavingFolder, setIsSavingFolder] = useState(false)
  const [draft, setDraft] = useState<DraftAnswers>(emptyDraft)
  const [editableFields, setEditableFields] = useState<EditableField[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [typingId, setTypingId] = useState<string | null>(null)
  const greetingInitialized = useRef(false)
  const lastGeneratedFolderDetails = useRef<{
    description: string
    folderName: string
    promptDescription: string
  }>({ description: '', folderName: '', promptDescription: '' })
  const [editingFromReview, setEditingFromReview] = useState(false)
  const [aiDescriptionGenerated, setAiDescriptionGenerated] = useState(false)
  const [aiFieldsGenerated, setAiFieldsGenerated] = useState(false)
  const [isDraftReady, setIsDraftReady] = useState(false)
  const [isReviewStepsMinimized, setIsReviewStepsMinimized] = useState(true)
  const [hasToggledRequired, setHasToggledRequired] = useState(false)
  const listRef = useRef<HTMLDivElement | null>(null)
  const stepNodeRefs = useRef<
    Partial<Record<BuilderStepId, HTMLDivElement | null>>
  >({})
  const draftRef = useRef(draft)
  draftRef.current = draft
  const fieldsRef = useRef(editableFields)
  fieldsRef.current = editableFields
  const previousStepRef = useRef<BuilderStepId>(1)

  const persistAiFolderDraft = useCallback(async (currentStep: number) => {
    const step = Math.min(Math.max(currentStep, 1), 5)
    const current = draftRef.current
    const { data, error } = await saveWizardDraft('folder', {
      currentStep: step,
      currentStepKey: folderStepKey(step),
      draftId: folderDraftIdRef.current,
      draftJson: JSON.stringify(
        buildFolderDraftJson({
          description: current.description,
          fields: fieldsRef.current,
          folderName: current.folderName,
          integrations: current.integrations,
          source: 'ai',
          storage: current.storage || 'EZOFIS Drive',
          versioning: current.versioning || 'Incremental Version',
        }),
      ),
    })
    if (data?.id) folderDraftIdRef.current = data.id
    if (error) {
      showToast({
        message: error,
        variant: 'warning',
      })
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const { data, notFound } = await getActiveWizardDraft('folder')
      if (cancelled) return

      folderDraftIdRef.current =
        !notFound && data?.id && !data.isCompleted ? data.id : null

      if (!notFound && data?.draftJson && !data.isCompleted) {
        const snap = hydrateFolderFromDraft(data.draftJson)

        if (snap.folderName && !snap.editingRepositoryId) {
          greetingInitialized.current = true
          skipNextPersistRef.current = true
          setDraft({
            description: snap.description || '',
            folderName: snap.folderName,
            integrations: snap.integrations || '',
            promptDescription: '',
            storage: snap.storage || '',
            structure: '',
            versioning: snap.versioning || '',
          })
          if (snap.fields?.length) {
            setEditableFields(
              snap.fields.map((field) => ({
                aiGenerated: false,
                dataType: String(field.dataType || 'SHORT_TEXT'),
                fieldName: String(field.fieldName || ''),
                iconKey: field.iconKey,
                id: String(field.id || crypto.randomUUID()),
                includeInFolderStructure: Boolean(
                  field.includeInFolderStructure,
                ),
                isMandatory: Boolean(field.isMandatory),
              })),
            )
          }

          const restoredStep = folderStepFromDraft(
            data.currentStep,
            data.currentStepKey,
          )
          const hasAll =
            Boolean(snap.folderName) &&
            Boolean(snap.fields?.length) &&
            Boolean(snap.storage) &&
            Boolean(snap.versioning) &&
            Boolean(snap.integrations)

          if (hasAll) {
            setPhase('ready')
            setActiveStep(6)
          } else {
            setActiveStep(restoredStep)
            if (restoredStep === 1) setPhase('details_ready')
            else if (restoredStep === 2) {
              setPhase(snap.fields?.length ? 'fields_ready' : 'fields')
            } else if (restoredStep === 3) setPhase('storage')
            else if (restoredStep === 4) setPhase('versioning')
            else setPhase('integrations')
          }

          setMessages([
            {
              id: crypto.randomUUID(),
              role: 'assistant',
              stepId: hasAll ? 6 : restoredStep,
              text: t`Resumed your saved folder setup. Continue from where you left off.`,
            },
          ])
        }
      }

      persistReadyRef.current = true
      setIsDraftReady(true)
    })()

    return () => {
      cancelled = true
    }
  }, [t])

  useEffect(() => {
    if (greetingInitialized.current) return
    if (!isDraftReady) return
    greetingInitialized.current = true
    setMessages([
      {
        chips: [...nameChips, ...examplePrompts],
        id: initialGreetingId,
        role: 'assistant',
        stepId: 1,
        text: nameQuestion,
      },
    ])
    setTypingId(initialGreetingId)
  }, [examplePrompts, initialGreetingId, isDraftReady, nameChips, nameQuestion])

  useEffect(() => {
    if (!persistReadyRef.current) return
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false
      previousStepRef.current = activeStep
      return
    }

    const previous = previousStepRef.current
    previousStepRef.current = activeStep
    if (activeStep > previous || activeStep === 6) {
      void persistAiFolderDraft(previous === 6 ? 5 : previous)
    }
  }, [activeStep, persistAiFolderDraft])

  useEffect(() => {
    const node = listRef.current
    if (!node) return
    if (editingFromReview) return
    node.scrollTop = node.scrollHeight
  }, [messages, isSending, typingId, activeStep, phase, editingFromReview])

  const completedSteps = useMemo(() => {
    const done = new Set<BuilderStepId>()
    if (draft.folderName.trim() && draft.description.trim() && activeStep > 1) {
      done.add(1)
    }
    if (editableFields.length > 0 && activeStep > 2) done.add(2)
    if (draft.storage.trim() && activeStep > 3) done.add(3)
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
    const description = answers.description.trim() || suggestion.description
    setDraft({
      description,
      folderName,
      integrations: answers.integrations || 'None',
      promptDescription: answers.promptDescription || suggestion.description,
      storage: answers.storage || 'EZOFIS Drive',
      structure: answers.structure || RECOMMEND_FIELDS_VALUE,
      versioning: answers.versioning || 'Incremental Version',
    })
    setEditableFields(toEditableFields(suggestion.fields))
  }

  const generateDescription = async (
    folderName: string,
    promptText?: string,
  ) => {
    setIsSending(true)
    try {
      const prompt = promptText || `Create a folder named "${folderName}".`
      const suggestion = await generateFolderConfig(
        `${prompt} Generate a concise database description for this folder and propose starter fields.`,
        messages.slice(-6).map((message) => ({
          role: message.role,
          text: message.text,
        })),
      )

      const dbDescription = shortenDescription(suggestion.description)
      const fieldRequirements = promptText || suggestion.description

      setDraft((prev) => ({
        ...prev,
        description: dbDescription,
        folderName,
        promptDescription: fieldRequirements,
      }))
      setAiDescriptionGenerated(Boolean(dbDescription))

      pushAssistant(
        dbDescription
          ? t`Folder details ready: “${dbDescription}” Review requirements & description below, then continue.`
          : t`Folder “${folderName}” is ready. Continue to choose a storage provider.`,
        undefined,
        'details_ready',
        1,
      )
    } catch (error: any) {
      const message =
        error?.message ||
        t`Could not generate description. You can retry with another folder name.`
      showToast({ message, variant: 'error' })
      pushAssistant(`${message}`, [...nameChips, ...examplePrompts], 'name', 1)
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
      const detailedRequirement =
        answers.promptDescription.trim() ||
        answers.description.trim() ||
        answers.folderName

      const suggestion = await generateFolderConfig(
        [
          `Create a repository folder named "${answers.folderName}".`,
          `Field & requirement details: ${detailedRequirement}.`,
          answers.description
            ? `Short DB description: ${answers.description}.`
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
        description:
          prev.description || shortenDescription(suggestion.description),
        structure: structurePreference,
      }))

      pushAssistant(
        suggestion.reply ||
          t`Recommended ${fields.length} fields for “${answers.folderName}”. Adjust them below, then continue.`,
        undefined,
        'fields_ready',
        2,
      )
    } catch (error: any) {
      const message =
        error?.message ||
        t`Could not generate fields. Try Recommend fields again.`
      showToast({ message, variant: 'error' })
      pushAssistant(message, fieldChips, 'fields', 2)
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
          t`Configuration for “${suggestion.folderName}” is ready. Review each step and continue through the remaining options.`,
        undefined,
        'details_ready',
        1,
      )
    } catch (error: any) {
      const message =
        error?.message || t`Could not generate folder configuration. Try again.`
      showToast({ message, variant: 'error' })
      pushAssistant(message, [...nameChips, ...examplePrompts], 'name', 1)
    } finally {
      setIsSending(false)
    }
  }

  const continueFromDetails = async () => {
    if (!draft.folderName.trim()) return

    const nameTrimmed = draft.folderName.trim()
    const promptTrimmed = draft.promptDescription.trim()
    const descTrimmed = draft.description.trim()

    const detailsChanged =
      lastGeneratedFolderDetails.current.folderName !== nameTrimmed ||
      lastGeneratedFolderDetails.current.promptDescription !== promptTrimmed

    if (detailsChanged || editableFields.length === 0) {
      lastGeneratedFolderDetails.current = {
        description: descTrimmed,
        folderName: nameTrimmed,
        promptDescription: promptTrimmed,
      }

      pushAssistant(
        t`Folder details updated. Regenerating recommended fields for “${nameTrimmed}”…`,
        undefined,
        'fields',
        2,
      )
      await generateFields(
        {
          ...draft,
          description: descTrimmed,
          folderName: nameTrimmed,
          promptDescription: promptTrimmed,
        },
        draft.structure || RECOMMEND_FIELDS_VALUE,
      )
      return
    }

    if (editingFromReview) {
      goToReview()
      return
    }
    pushAssistant(
      t`How should documents be organized? Choose Recommend fields or another option.`,
      fieldChips,
      'fields',
      2,
    )
  }

  const handleSelectStep = (stepId: BuilderStepId) => {
    const isAllowed =
      stepId <= unlockedStep ||
      completedSteps.has(stepId) ||
      phase === 'ready' ||
      editingFromReview
    if (!isAllowed) return

    if (phase === 'ready' || completedSteps.has(stepId) || stepId < unlockedStep) {
      setEditingFromReview(true)
    }

    setActiveStep(stepId)
    setTypingId(null)
    setInput('')

    if (stepId === 1) {
      setPhase('details_ready')
    } else if (stepId === 2) {
      if (editableFields.length) {
        setPhase('fields_ready')
      } else {
        setPhase('fields')
      }
    } else if (stepId === 3) {
      setPhase('storage')
    } else if (stepId === 4) {
      setPhase('versioning')
    } else if (stepId === 5) {
      setPhase('integrations')
    } else if (stepId === 6) {
      goToReview()
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

  const continueFromFields = () => {
    if (!editableFields.length) return
    if (editingFromReview) {
      goToReview()
      return
    }
    pushAssistant(
      t`Select the storage provider where documents for this folder should be stored.`,
      storageChips,
      'storage',
      3,
    )
  }

  const scrollToReview = useCallback(() => {
    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        const reviewEl = stepNodeRefs.current[6]
        if (reviewEl) {
          reviewEl.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          })
        }
      }, 100)
    })
  }, [])

  const goToReview = () => {
    setEditingFromReview(false)
    setTypingId(null)
    setPhase('ready')
    setActiveStep(6)
    setInput('')
    scrollToReview()
  }

  useEffect(() => {
    if (phase === 'ready' && !editingFromReview) {
      scrollToReview()
    }
  }, [editingFromReview, phase, scrollToReview])

  const editFromReview = (stepId: BuilderStepId) => {
    setEditingFromReview(true)
    setTypingId(null)
    setInput('')
    setActiveStep(stepId)

    if (stepId === 1) {
      setPhase('details_ready')
    } else if (stepId === 2) {
      if (editableFields.length) {
        setPhase('fields_ready')
      } else {
        pushAssistant(
          t`How should documents be organized? Choose Recommend fields or another option.`,
          fieldChips,
          'fields',
          2,
        )
      }
    } else if (stepId === 3) {
      pushAssistant(
        t`Update the storage provider for this folder.`,
        storageChips,
        'storage',
        3,
      )
    } else if (stepId === 4) {
      pushAssistant(
        t`Update the versioning strategy for this folder.`,
        versioningChips,
        'versioning',
        4,
      )
    } else {
      pushAssistant(
        t`Update the integration preference for this folder.`,
        integrationChips,
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
        setDraft((prev) => ({
          ...prev,
          promptDescription: value,
        }))
        await generateFullSetup(draft, value)
        return
      }

      const folderName = shortenFolderName(value)
      setDraft((prev) => ({
        ...prev,
        description: '',
        folderName,
        promptDescription: value,
      }))
      setInput('')
      appendUser(folderName)
      pushAssistant(
        t`Folder name recorded as “${folderName}”. Generating details now…`,
        undefined,
        'name',
        1,
      )
      await generateDescription(folderName, value)
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
        t`Which versioning strategy should apply when the same file is uploaded again?`,
        versioningChips,
        'versioning',
        4,
      )
      return
    }

    if (phase === 'fields') {
      const structure = value || RECOMMEND_FIELDS_VALUE
      setDraft((prev) => ({ ...prev, structure }))
      setInput('')
      appendUser(
        structure === RECOMMEND_FIELDS_VALUE ? t`Recommend fields` : structure,
      )
      pushAssistant(
        t`Generating recommended fields for this folder…`,
        undefined,
        'fields',
        2,
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
        t`Versioning strategy saved. Do you require an ERP or system integration, or should integrations be configured later?`,
        integrationChips,
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
    fields: t`Describe structure or fields…`,
    integrations: t`Or type an integration…`,
    name: t`Enter folder name…`,
    storage: t`Or type a storage provider…`,
    versioning: t`Or type a versioning strategy…`,
  }

  const canSend =
    !isSending &&
    (phase === 'name' || phase === 'fields') &&
    Boolean(input.trim())

  const activeAssistant = [...messages]
    .reverse()
    .find((message) => message.role === 'assistant')

  const showActiveQuestion =
    Boolean(activeAssistant) && typingId !== activeAssistant?.id && !isSending

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
          className='max-h-28 min-h-[52px] w-full resize-none rounded-[14px] bg-transparent py-3 pr-12 pl-3.5 text-[13px] text-[var(--gray-13)] outline-none'
          disabled={isSending}
          placeholder={placeholderByPhase[phase] || t`Type your answer…`}
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
            aria-label={t`Send`}
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

  const getStepQuestionMessage = (stepId: BuilderStepId) => {
    const recordedMessage = [...messages]
      .reverse()
      .find((m) => m.role === 'assistant' && m.stepId === stepId)

    if (recordedMessage) return recordedMessage

    if (stepId === 3) {
      return {
        chips: storageChips,
        id: 'step-3-storage-fallback',
        role: 'assistant' as const,
        stepId: 3,
        text: t`Select the storage provider where documents for this folder should be stored.`,
      }
    }
    if (stepId === 4) {
      return {
        chips: versioningChips,
        id: 'step-4-versioning-fallback',
        role: 'assistant' as const,
        stepId: 4,
        text: t`Which versioning strategy should apply when the same file is uploaded again?`,
      }
    }
    if (stepId === 5) {
      return {
        chips: integrationChips,
        id: 'step-5-integrations-fallback',
        role: 'assistant' as const,
        stepId: 5,
        text: t`Do you require an ERP or system integration, or should integrations be configured later?`,
      }
    }
    if (stepId === 2) {
      return {
        chips: fieldChips,
        id: 'step-2-fields-fallback',
        role: 'assistant' as const,
        stepId: 2,
        text: t`How should documents be organized? Choose Recommend fields or another option.`,
      }
    }

    return null
  }

  const renderActiveStepBody = (stepId: BuilderStepId) => {
    if (phaseToStep(phase) !== stepId && activeStep !== stepId) return null

    const questionMessage = getStepQuestionMessage(stepId)

    const iconGutter = 'pl-[28px]'

    const selectedValue =
      stepId === 2
        ? draft.structure
        : stepId === 3
          ? draft.storage
          : stepId === 4
            ? draft.versioning
            : stepId === 5
              ? draft.integrations
              : undefined

    return (
      <div className='space-y-4'>
        {questionMessage ? (
          <div className='space-y-3'>
            <div className='flex items-start gap-2 text-[13px] leading-relaxed text-[var(--gray-12)]'>
              <span className='mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-3'>
                <AiBrandIcon
                  className='size-3.5 shrink-0'
                  variant='outline-purple'
                />
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
          <div
            className={cn(
              'flex items-center gap-2 text-[12px] font-medium text-primary-9',
              iconGutter,
            )}
          >
            <SparkIconLoading size={16} />
            {stepId === 1
              ? t`Generating description…`
              : stepId === 2
                ? t`Generating recommended fields…`
                : t`Working…`}
          </div>
        ) : null}

        {phase === 'details_ready' && draft.folderName ? (
          <div
            className={cn(
              'space-y-3 rounded-[12px] border border-primary-4 bg-primary-2 p-4',
              iconGutter,
            )}
          >
            <p className='text-[11px] font-semibold tracking-[0.08em] text-primary-9 uppercase'>
              {t`Folder details`}
            </p>
            <div className='space-y-3'>
              <div>
                <label className='mb-1 block text-[11px] font-semibold text-[var(--gray-12)]'>
                  {t`Folder Name`}
                </label>
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
              </div>

              <div>
                <label className='mb-1 block text-[11px] font-semibold text-[var(--gray-12)]'>
                  {t`Description`}
                </label>
                <div className='flex items-start gap-1.5'>
                  <textarea
                    className='min-h-[72px] min-w-0 flex-1 resize-none rounded-md border border-primary-4 bg-surface px-2.5 py-1.5 text-[12px] leading-relaxed text-[var(--gray-11)] outline-none focus:border-primary-9'
                    value={draft.description}
                    onChange={(event) => {
                      setAiDescriptionGenerated(false)
                      const val = event.target.value
                      setDraft((prev) => ({
                        ...prev,
                        description: val,
                        promptDescription: val,
                      }))
                    }}
                  />
                  {aiDescriptionGenerated ? (
                    <span
                      className='mt-1.5 inline-flex shrink-0 text-primary-9'
                      title={t`Generated by AI`}
                    >
                      <Icon className='size-3.5' name='tabler:sparkles' />
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {phase === 'fields_ready' && editableFields.length > 0 ? (
          <div className={iconGutter}>
            <FieldsEditor
              fields={editableFields}
              hasToggledRequired={hasToggledRequired}
              onChange={setEditableFields}
              onUserToggledRequired={() => setHasToggledRequired(true)}
            />
          </div>
        ) : null}

        {questionMessage?.chips?.length && typingId !== questionMessage.id ? (
          <div className={iconGutter}>
            <SuggestionChipRow
              chips={questionMessage.chips}
              disabled={isSending}
              selectedValue={selectedValue}
              onSelect={(value) => void handleGuidedAnswer(value)}
            />
          </div>
        ) : null}

        {phase === 'details_ready' && !typingId && !isSending ? (
          <div className={cn('flex justify-end gap-2', iconGutter)}>
            <Button
              color='primary'
              icon={editingFromReview ? 'lucide:check' : 'lucide:arrow-right'}
              label={
                lastGeneratedFolderDetails.current.folderName !==
                  draft.folderName.trim() ||
                lastGeneratedFolderDetails.current.promptDescription !==
                  draft.promptDescription.trim()
                  ? t`Save & Regenerate Fields`
                  : editingFromReview
                    ? t`Done`
                    : t`Continue`
              }
              onClick={() => void continueFromDetails()}
            />
          </div>
        ) : null}

        {phase === 'fields_ready' && !typingId && !isSending ? (
          <div className='space-y-3'>
            {/* Live summary line */}
            <div className={cn('flex items-center justify-between text-[12px] font-medium text-gray-10', iconGutter)}>
              <span>
                {t`${editableFields.filter((f) => f.isMandatory || f.includeInFolderStructure).length} of ${editableFields.length} fields required`}
              </span>
            </div>

            <div
              className={cn(
                'flex items-center justify-between gap-2',
                iconGutter,
              )}
            >
              <Button
                color='primary'
                icon='lucide:arrow-left'
                label={t`Back`}
                variant='subtle'
                onClick={() => handleSelectStep(1)}
              />
              <div className='flex items-center gap-2'>
                <Button
                  color='primary'
                  icon='tabler:sparkles'
                  label={t`Regenerate`}
                  variant='subtle'
                  onClick={() => {
                    setPhase('fields')
                    pushAssistant(
                      t`How should documents be organized? Choose Recommend fields or another option.`,
                      fieldChips,
                      'fields',
                      2,
                    )
                  }}
                />
                <Button
                  color='primary'
                  disabled={!editableFields.length}
                  icon={editingFromReview ? 'lucide:check' : 'lucide:arrow-right'}
                  label={editingFromReview ? t`Done` : t`Continue`}
                  onClick={continueFromFields}
                />
              </div>
            </div>
          </div>
        ) : null}

        {phase === 'storage' && !typingId && !isSending ? (
          <div
            className={cn(
              'flex items-center justify-between gap-2',
              iconGutter,
            )}
          >
            <Button
              color='primary'
              icon='lucide:arrow-left'
              label={t`Back`}
              variant='subtle'
              onClick={() => handleSelectStep(2)}
            />
          </div>
        ) : null}

        {phase === 'versioning' && !typingId && !isSending ? (
          <div
            className={cn(
              'flex items-center justify-between gap-2',
              iconGutter,
            )}
          >
            <Button
              color='primary'
              icon='lucide:arrow-left'
              label={t`Back`}
              variant='subtle'
              onClick={() => handleSelectStep(3)}
            />
          </div>
        ) : null}

        {phase === 'integrations' && !typingId && !isSending ? (
          <div
            className={cn(
              'flex items-center justify-between gap-2',
              iconGutter,
            )}
          >
            <Button
              color='primary'
              icon='lucide:arrow-left'
              label={t`Back`}
              variant='subtle'
              onClick={() => handleSelectStep(4)}
            />
          </div>
        ) : null}

        {(phase === 'name' || phase === 'fields') && !typingId && !isSending ? (
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
              color='primary'
              label={t`Back to review`}
              variant='subtle'
              onClick={goToReview}
            />
          </div>
        ) : null}
      </div>
    )
  }

  const handleSaveFolder = async () => {
    if (!canApply || isSavingFolder) return
    setIsSavingFolder(true)
    try {
      await persistAiFolderDraft(5)
      await onApply({
        description: draft.description.trim(),
        fields: stripEditableIds(editableFields),
        folderName: draft.folderName,
        integrations: draft.integrations || 'None',
        storage: draft.storage || 'EZOFIS Drive',
        versioning: draft.versioning || 'Incremental Version',
      })
    } finally {
      setIsSavingFolder(false)
    }
  }

  const compactSummaries: Record<BuilderStepId, ReactNode> = {
    1: draft.folderName || t`Untitled folder`,
    2: editableFields.length
      ? t`${editableFields.length} fields configured`
      : t`Fields pending`,
    3: draft.storage || t`EZOFIS Drive`,
    4: draft.versioning || t`Incremental Version`,
    5:
      draft.integrations === 'None' || !draft.integrations
        ? t`No integrations`
        : draft.integrations,
    6: null,
  }

  const renderReviewStepBody = () => (
    <div className='space-y-4'>
      {/* Quick Summary Card */}
      <div className='divide-y divide-primary-4 rounded-[12px] border border-primary-4 bg-surface'>
        {/* Row 1: Folder Details */}
        <div className='flex items-start justify-between gap-4 p-3.5'>
          <div className='min-w-0 flex-1'>
            <span className='text-[11px] font-semibold tracking-wider text-primary-9 uppercase'>
              {t`Folder Details`}
            </span>
            <p className='mt-1 text-[13px] font-semibold text-[var(--gray-13)]'>
              {draft.folderName || t`Untitled folder`}
            </p>
            {draft.description.trim() ? (
              <p className='mt-0.5 line-clamp-2 text-[12px] text-[var(--gray-10)]'>
                {draft.description}
              </p>
            ) : null}
          </div>
          <Button
            color='gray'
            icon='lucide:pencil'
            label={t`Edit`}
            size='xs'
            variant='subtle'
            className='bg-transparent'
            iconClass='size-3'
            onClick={() => editFromReview(1)}
          />
        </div>

        {/* Row 2: Fields Quick Summary */}
        <div className='flex items-start justify-between gap-4 p-3.5'>
          <div className='min-w-0 flex-1'>
            <div className='flex items-center gap-2'>
              <span className='text-[11px] font-semibold tracking-wider text-primary-9 uppercase'>
                {t`Fields`}
              </span>
              <span className='inline-flex items-center rounded-full bg-primary-2 px-2 py-0.5 text-[11px] font-semibold text-primary-9'>
                {editableFields.length}
              </span>
            </div>
            <div className='mt-1.5 flex flex-wrap gap-1.5'>
              {editableFields.slice(0, 8).map((field) => (
                <span
                  key={field.id}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium',
                    field.includeInFolderStructure
                      ? 'border border-primary-4 bg-primary-1 font-semibold text-primary-10'
                      : 'border border-[var(--gray-3)] bg-surface text-[var(--gray-12)]',
                  )}
                >
                  {field.includeInFolderStructure ? (
                    <Icon
                      className='size-3 text-primary-9'
                      name='lucide:folder-tree'
                    />
                  ) : null}
                  {field.fieldName}
                  {field.isMandatory ? (
                    <span className='text-[var(--red-10)]'>*</span>
                  ) : null}
                </span>
              ))}
              {editableFields.length > 8 ? (
                <span className='inline-flex items-center rounded-md border border-[var(--gray-3)] bg-surface px-2 py-0.5 text-[11px] text-[var(--gray-9)]'>
                  {t`+${editableFields.length - 8} more`}
                </span>
              ) : null}
            </div>
          </div>
          <Button
            color='gray'
            icon='lucide:pencil'
            label={t`Edit`}
            size='xs'
               iconClass='size-3'
            variant='subtle'
             className='bg-transparent'
            onClick={() => editFromReview(2)}
          />
        </div>

        {/* Row 3: Storage, Versioning, Integrations */}
        <div className='grid grid-cols-1 divide-y divide-primary-4 sm:grid-cols-3 sm:divide-x sm:divide-y-0'>
          {/* Storage */}
          <div className='flex items-start justify-between gap-2 p-3.5'>
            <div className='min-w-0 flex-1'>
              <span className='text-[11px] font-semibold tracking-wider text-primary-9 uppercase'>
                {t`Storage`}
              </span>
              <p className='mt-1 truncate text-[13px] font-medium text-[var(--gray-12)]'>
                {draft.storage || t`EZOFIS Drive`}
              </p>
            </div>
            <Button
              color='gray'
               className='bg-transparent'
              icon='lucide:pencil'
              size='xs'
              variant='subtle'
              onClick={() => editFromReview(3)}
            />
          </div>

          {/* Versioning */}
          <div className='flex items-start justify-between gap-2 p-3.5'>
            <div className='min-w-0 flex-1'>
              <span className='text-[11px] font-semibold tracking-wider text-primary-9 uppercase'>
                {t`Versioning`}
              </span>
              <p className='mt-1 truncate text-[13px] font-medium text-[var(--gray-12)]'>
                {draft.versioning || t`Incremental Version`}
              </p>
            </div>
            <Button
              color='gray'
              icon='lucide:pencil'
               className='bg-transparent'
              size='xs'
              variant='subtle'
              onClick={() => editFromReview(4)}
            />
          </div>

          {/* Integrations */}
          <div className='flex items-start justify-between gap-2 p-3.5'>
            <div className='min-w-0 flex-1'>
              <span className='text-[11px] font-semibold tracking-wider text-primary-9 uppercase'>
                {t`Integrations`}
              </span>
              <p className='mt-1 truncate text-[13px] font-medium text-[var(--gray-12)]'>
                {draft.integrations && draft.integrations !== 'None'
                  ? draft.integrations
                  : t`None`}
              </p>
            </div>
            <Button
              color='gray'
               className='bg-transparent'
              icon='lucide:pencil'
              size='xs'
              variant='subtle'
              onClick={() => editFromReview(5)}
            />
          </div>
        </div>
      </div>

      {/* Save Folder Callout */}
      <div className='flex flex-col gap-3 rounded-[12px] border border-primary-4 bg-primary-1/40 p-4 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <p className='text-[14px] font-semibold text-[var(--gray-13)]'>
            {t`Ready to create folder?`}
          </p>
          <p className='text-[12px] text-[var(--gray-10)]'>
            {t`Apply your reviewed settings to create this folder.`}
          </p>
        </div>
        <Button
          color='primary'
          disabled={!canApply || isSavingFolder}
          icon='lucide:save'
          label={isSavingFolder ? t`Saving…` : t`Save Folder`}
          size='md'
          onClick={() => void handleSaveFolder()}
        />
      </div>
    </div>
  )

  const stepSummaries: Record<BuilderStepId, ReactNode> = {
    1: (
      <div className='space-y-1.5'>
        <p className='text-[13px] font-semibold text-[var(--gray-13)]'>
          {draft.folderName || t`Untitled folder`}
        </p>
        <div className='flex items-start gap-1.5'>
          <p className='min-w-0 flex-1 text-[12px] text-[var(--gray-10)]'>
            {draft.description.trim() || t`Description pending`}
          </p>
          {aiDescriptionGenerated ? (
            <span
              className='mt-0.5 inline-flex shrink-0 text-primary-9'
              title={t`Generated by AI`}
            >
              <Icon className='size-3.5' name='tabler:sparkles' />
            </span>
          ) : null}
        </div>
      </div>
    ),
    2: (
      <p className='text-[12px] text-[var(--gray-11)]'>
        {editableFields.length
          ? t`${editableFields.length} fields configured`
          : t`Fields pending`}
      </p>
    ),
    3: draft.storage ? <StorageBadge storage={draft.storage} /> : null,
    4: (
      <span className='rounded-full bg-[var(--gray-2)] px-2.5 py-1 text-[11px] font-medium text-[var(--gray-11)]'>
        {draft.versioning}
      </span>
    ),
    5: (
      <span className='rounded-full bg-[var(--gray-2)] px-2.5 py-1 text-[11px] font-medium text-[var(--gray-11)]'>
        {draft.integrations === 'None' || !draft.integrations
          ? t`No integrations`
          : draft.integrations}
      </span>
    ),
    6: renderReviewStepBody(),
  }

  return (
    <div className='flex h-full min-h-0 flex-col bg-[var(--gray-1)]'>
      <div className='flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border-default)] bg-surface px-4 py-3'>
        <div className='flex min-w-0 items-center gap-2'>
          <IconButton
            ariaLabel={t`Back`}
            color='gray'
            icon='lucide:arrow-left'
            size='md'
            variant='ghost'
            onClick={handleBack}
          />
          <div className='min-w-0'>
            <h1 className='mb-0.5 truncate text-15 font-semibold text-[var(--gray-13)]'>
              {t`AI Folder Builder`}
            </h1>
            <p className='truncate text-12 text-[var(--gray-9)]'>
              {t`Complete each stage, then continue`}
            </p>
          </div>
        </div>
        <Button
          color='primary'
          disabled={!canApply || isSavingFolder}
          icon='lucide:save'
          label={isSavingFolder ? t`Saving…` : t`Save Folder`}
          onClick={() => void handleSaveFolder()}
        />
      </div>

      <div className='min-h-0 flex-1 overflow-y-auto' ref={listRef}>
        <div className='mx-auto flex w-full max-w-[720px] flex-col px-4 py-8 sm:px-6'>
          {phase === 'ready' && !editingFromReview ? (
            <div className='mb-4 flex items-center justify-between rounded-[12px] border border-primary-4 bg-primary-1/30 px-4 py-2.5'>
              <div className='flex items-center gap-2'>
                <span className='inline-flex size-5 items-center justify-center rounded-full bg-green-9 text-white shadow-2xs'>
                  <Icon className='size-3 stroke-[2.5]' name='tabler:check' />
                </span>
                <span className='text-[13px] font-semibold text-[var(--gray-13)]'>
                  {t`Setup stages (5 of 5 completed)`}
                </span>
              </div>
              <button
                className='inline-flex items-center gap-1 text-[12px] font-medium text-primary-9 transition-colors hover:underline'
                type='button'
                onClick={() => setIsReviewStepsMinimized((prev) => !prev)}
              >
                {isReviewStepsMinimized
                  ? t`Expand all steps`
                  : t`Minimize all steps`}
              </button>
            </div>
          ) : null}

          {builderSteps.map((item, index) => {
            const showAllFlow = phase === 'ready' || editingFromReview
            const visible = showAllFlow ? true : item.id <= unlockedStep
            if (!visible) return null

            const isAtReview = phase === 'ready' && !editingFromReview
            const isMinimized =
              isAtReview && isReviewStepsMinimized && item.id < 6

            const status = stepStatus(item.id)
            const nextStep = builderSteps[index + 1]
            const nextVisible = nextStep
              ? showAllFlow || nextStep.id <= unlockedStep
              : false

            const isEditingThis = editingFromReview && item.id === activeStep

            let bottomConnectorState: TimelineConnectorState = 'hidden'
            if (nextVisible) {
              if (showAllFlow || completedSteps.has(item.id)) {
                bottomConnectorState = 'completed'
              } else {
                bottomConnectorState = 'idle'
              }
            }

            const prevStep = builderSteps[index - 1]
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
                  minimized={isMinimized}
                  showTopConnector={index > 0}
                  status={status}
                  stepId={item.id}
                  title={item.title}
                  topConnectorState={topConnectorState}
                  summary={
                    isMinimized
                      ? compactSummaries[item.id]
                      : status === 'completed' ||
                          (phase === 'ready' && item.id === 6)
                        ? stepSummaries[item.id]
                        : undefined
                  }
                  onSelectStep={(id) => handleSelectStep(id as BuilderStepId)}
                >
                  {item.id === 6 && phase === 'ready'
                    ? renderReviewStepBody()
                    : status === 'active' || isEditingThis || activeStep === item.id
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
