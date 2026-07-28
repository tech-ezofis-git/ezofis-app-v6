import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import GoogleDriveLogo from '@/assets/brands/googledrive.svg'
import OneDriveLogo from '@/assets/brands/onedrive.svg'
import Icon from '@/components/base/icon/Icon'
import InputCheckbox from '@/components/base/inputs/InputCheckbox'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputText from '@/components/base/inputs/InputText'
import InputTextarea from '@/components/base/inputs/InputTextarea'
import SortableContainer from '@/components/base/sortable/SortableContainer'
import SortableItem from '@/components/base/sortable/SortableItem'
import {
  generateFolderConfig,
  type FolderConfigField,
} from '@/services/ai/gemini'
import type { Option } from '@/types/option'
import cn from '@/utils/cn'
import {
  AiProcessingState,
  CompactNextButton,
  FolderCreationHeader,
  HiddenScrollRow,
  InlineAlert,
  OptionCard,
  SetupTimeline,
  StepCarousel,
  type SetupStepId,
} from './AiFolderBuilderWorkspace'

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

type FlowStage = SetupStepId | 'creating' | 'success'
type DetailsPhase = 'ask' | 'processing' | 'recommend'

const PURPOSE_CHIPS = [
  'Accounts Payable',
  'Accounts Receivable',
  'Employee Records',
  'Legal Contracts',
  'Purchase Orders',
  'Project Documents',
]

const STORAGE_OPTIONS: Array<{
  code: string
  description: string
  icon: string
  id: string
  logo?: string
  recommended?: boolean
  title: string
}> = [
  {
    code: 'EZOFIS_DRIVE',
    description: 'Store and manage documents directly within EZOFIS.',
    icon: 'lucide:hard-drive',
    id: 'EZOFIS Drive',
    recommended: true,
    title: 'EZOFIS Drive',
  },
  {
    code: 'ONEDRIVE',
    description: 'Use an authorised Microsoft OneDrive connection.',
    icon: 'lucide:cloud',
    id: 'One Drive',
    logo: OneDriveLogo,
    title: 'Microsoft OneDrive',
  },
  {
    code: 'GOOGLE_DRIVE',
    description: 'Use an authorised Google Drive connection.',
    icon: 'lucide:cloud',
    id: 'Google Drive',
    logo: GoogleDriveLogo,
    title: 'Google Drive',
  },
]

const VERSIONING_OPTIONS: Array<{
  description: string
  id: string
  recommended?: boolean
  title: string
  value: string
  warning?: string
}> = [
  {
    description: 'Create versions such as V1, V2 and V3.',
    id: 'Incremental Version',
    recommended: true,
    title: 'Incremental Version',
    value: 'INCREMENTAL',
  },
  {
    description: 'Create a version using the upload date and time.',
    id: 'Timestamp Version',
    title: 'Timestamp Version',
    value: 'TIMESTAMP',
  },
  {
    description: 'Replace the previous file without creating a new version.',
    id: 'Replace Existing',
    title: 'Replace Existing',
    value: 'REPLACE',
    warning:
      'Existing files with the same name will be overwritten permanently.',
  },
]

const INTEGRATION_OPTIONS = [
  { description: 'No external system connection.', icon: 'lucide:ban', id: 'None', title: 'None' },
  { description: 'Connect SAP modules and entities.', icon: 'lucide:boxes', id: 'SAP', title: 'SAP' },
  { description: 'Sync with Oracle ERP.', icon: 'lucide:database', id: 'Oracle ERP', title: 'Oracle ERP' },
  { description: 'Connect Microsoft Dynamics.', icon: 'lucide:app-window', id: 'Microsoft Dynamics', title: 'Microsoft Dynamics' },
  { description: 'Sync QuickBooks data.', icon: 'lucide:book-open', id: 'QuickBooks', title: 'QuickBooks' },
  { description: 'Configure a custom API integration.', icon: 'lucide:code-2', id: 'Custom API', title: 'Custom API' },
] as const

const FIELD_DATA_TYPES = [
  'SHORT_TEXT',
  'LONG_TEXT',
  'NUMBER',
  'DECIMAL',
  'CURRENCY_AMOUNT',
  'DATE',
  'DATE_TIME',
  'YES_NO_TOGGLE',
  'SINGLE_SELECT',
  'MULTI_SELECT',
  'EMAIL',
  'PHONE_NUMBER',
  'USER',
  'DEPARTMENT',
  'AUTO_NUMBER',
] as const

const FIELD_TYPE_LABELS: Record<string, string> = {
  SHORT_TEXT: 'Short Text',
  LONG_TEXT: 'Long Text',
  NUMBER: 'Number',
  DECIMAL: 'Decimal',
  CURRENCY_AMOUNT: 'Currency',
  DATE: 'Date',
  DATE_TIME: 'Date and Time',
  YES_NO_TOGGLE: 'Yes/No',
  SINGLE_SELECT: 'Single Select',
  MULTI_SELECT: 'Multi Select',
  EMAIL: 'Email',
  PHONE_NUMBER: 'Phone',
  USER: 'User',
  DEPARTMENT: 'Department',
  AUTO_NUMBER: 'Auto Number',
}

const FIELD_TYPE_OPTIONS: Option[] = FIELD_DATA_TYPES.map((type) => ({
  id: type,
  name: FIELD_TYPE_LABELS[type] || type,
  value: type,
}))

const CREATE_STATUS_STEPS = [
  'Creating folder',
  'Applying metadata fields',
  'Configuring versioning',
  'Connecting integration',
  'Finalising setup',
]

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function buildStorageInsight(storageId: string, folder: string) {
  const name = folder || 'this folder'
  if (storageId === 'EZOFIS Drive') {
    return `EZOFIS Drive works well for ${name} — fast search, native permissions, and no external connector setup.`
  }
  if (storageId === 'One Drive') {
    return `OneDrive keeps ${name} documents in Microsoft 365 while EZOFIS manages metadata on top.`
  }
  return `Google Drive helps sync shared files for ${name} while EZOFIS handles indexing and fields.`
}

function recommendVersioning(purposeText: string) {
  const text = purposeText.toLowerCase()
  if (
    text.includes('legal') ||
    text.includes('contract') ||
    text.includes('compliance') ||
    text.includes('audit')
  ) {
    return {
      versioning: 'Incremental Version',
      insight:
        'Incremental Versioning is a strong fit here — every update keeps recoverable history for audit and compliance.',
    }
  }
  if (text.includes('draft') || text.includes('temp') || text.includes('scratch')) {
    return {
      versioning: 'Replace Existing',
      insight:
        'Replace Existing suits draft-style work where only the latest file should remain.',
    }
  }
  return {
    versioning: 'Incremental Version',
    insight:
      'Choose how updated files should be handled. Incremental Versioning keeps prior versions without overwriting history.',
  }
}

function recommendIntegration(purposeText: string) {
  const text = purposeText.toLowerCase()
  if (
    text.includes('invoice') ||
    text.includes('payable') ||
    text.includes('receivable') ||
    text.includes('finance') ||
    text.includes('payment')
  ) {
    return {
      integrations: 'SAP',
      insight:
        'For finance document flows, SAP can sync invoice metadata with your ERP later. You can also skip this for now.',
    }
  }
  if (text.includes('hr') || text.includes('employee') || text.includes('people')) {
    return {
      integrations: 'None',
      insight:
        'HR folders often stay internal at first. You can start without an integration and connect a system later.',
    }
  }
  return {
    integrations: 'None',
    insight:
      'Integration is optional. Connect SAP, Dynamics, or a Custom API later if you need it.',
  }
}

const DEFAULT_METADATA_FIELDS: FolderConfigField[] = [
  {
    dataType: 'SHORT_TEXT',
    fieldName: 'Vendor Name',
    includeInFolderStructure: true,
    isMandatory: true,
  },
  {
    dataType: 'SINGLE_SELECT',
    fieldName: 'Document Type',
    includeInFolderStructure: true,
    isMandatory: true,
  },
  {
    dataType: 'SHORT_TEXT',
    fieldName: 'Invoice Number',
    includeInFolderStructure: false,
    isMandatory: true,
  },
  {
    dataType: 'DATE',
    fieldName: 'Invoice Date',
    includeInFolderStructure: false,
    isMandatory: true,
  },
  {
    dataType: 'CURRENCY_AMOUNT',
    fieldName: 'Total Amount',
    includeInFolderStructure: false,
    isMandatory: true,
  },
  {
    dataType: 'SINGLE_SELECT',
    fieldName: 'Payment Status',
    includeInFolderStructure: false,
    isMandatory: true,
  },
  {
    dataType: 'DATE',
    fieldName: 'Due Date',
    includeInFolderStructure: false,
    isMandatory: false,
  },
]

function formatFieldTypeLabel(value: string) {
  return (
    FIELD_TYPE_OPTIONS.find((option) => option.value === value)?.name ||
    value.replace(/_/g, ' ')
  )
}

const METADATA_RECOMMENDATION_OPTIONS = [
  {
    id: 'recommended',
    label: 'Suggest fields',
    prompt:
      'Suggest the best metadata fields and folder structure for this folder',
  },
  {
    id: 'supplier',
    label: 'By supplier / vendor',
    prompt: 'Organize by supplier or vendor, then document type',
  },
  {
    id: 'employee',
    label: 'By employee',
    prompt: 'Organize by employee, then document type',
  },
  {
    id: 'documentType',
    label: 'By document type',
    prompt: 'Organize primarily by document type',
  },
  {
    id: 'customer',
    label: 'By customer',
    prompt: 'Organize by customer, then document type',
  },
] as const

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

function sortFieldsByType(fields: EditableField[]): EditableField[] {
  const folderFields = fields.filter((field) => field.includeInFolderStructure)
  const normalFields = fields.filter((field) => !field.includeInFolderStructure)
  return [...folderFields, ...normalFields]
}

function FolderHierarchyPreview({
  folderName,
  fields,
}: {
  folderName: string
  fields: EditableField[]
}) {
  const hierarchy = fields.filter((field) => field.includeInFolderStructure)

  if (hierarchy.length === 0) {
    return (
      <InlineAlert tone='info'>
        Enable Folder Structure on fields to preview the hierarchy.
      </InlineAlert>
    )
  }

  return (
    <div className='rounded-[14px] border border-[var(--cyan-6)] bg-[var(--cyan-2)] px-4 py-3'>
      <p className='mb-2 text-[11px] font-semibold tracking-[0.04em] text-[var(--cyan-11)] uppercase'>
        Folder hierarchy
      </p>
      <div className='space-y-1.5 text-[13px] text-primary'>
        <p className='font-semibold'>{folderName || 'Folder'}</p>
        {hierarchy.map((field, index) => (
          <p className='pl-3 text-secondary' key={field.id}>
            {'→ '.repeat(Math.min(index + 1, 3))}
            {field.fieldName}
          </p>
        ))}
      </div>
      {hierarchy.length > 4 ? (
        <div className='mt-3'>
          <InlineAlert tone='warning'>
            More than four hierarchy levels may make navigation harder to use.
          </InlineAlert>
        </div>
      ) : null}
    </div>
  )
}

function MetadataFieldRow({
  field,
  onChange,
  onRemove,
}: {
  field: EditableField
  onChange: (patch: Partial<EditableField>) => void
  onRemove: () => void
}) {
  const isFolderField = field.includeInFolderStructure
  const [editingType, setEditingType] = useState(false)
  const selected =
    FIELD_TYPE_OPTIONS.find((option) => option.value === field.dataType) ||
    FIELD_TYPE_OPTIONS[0]

  return (
    <SortableItem
      className='items-center gap-2 rounded-[12px] border border-border-default/80 bg-surface-primary px-2.5 py-2 transition hover:border-border-focus'
      handlerClassName='size-7 text-muted'
      handlerPosition='before'
      id={field.id}
      trailing={
        <div className='ml-auto flex shrink-0 items-center gap-1'>
          {editingType ? (
            <div className='w-[130px]'>
              <InputSelect
                autoOpen
                classNames={{ input: 'h-7 text-11' }}
                options={FIELD_TYPE_OPTIONS}
                value={selected}
                width='target'
                onChange={(option) => {
                  if (!option?.value) return
                  onChange({ dataType: String(option.value) })
                }}
                onDropdownClose={() => setEditingType(false)}
              />
            </div>
          ) : (
            <button
              className='rounded-md px-1.5 py-1 text-[11px] text-secondary transition hover:bg-surface-secondary hover:text-primary'
              type='button'
              onClick={() => setEditingType(true)}
            >
              {formatFieldTypeLabel(field.dataType)}
            </button>
          )}
          <button
            aria-label={`Remove ${field.fieldName}`}
            className='flex size-7 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-[var(--error-main)]/10 hover:text-[var(--error-main)]'
            type='button'
            onClick={onRemove}
          >
            <Icon className='size-3.5' name='lucide:trash-2' />
          </button>
        </div>
      }
    >
      <button
        aria-label={
          isFolderField
            ? 'Change to document metadata'
            : 'Change to folder structure'
        }
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-[9px]',
          isFolderField
            ? 'bg-accent-soft text-accent-primary'
            : 'bg-[var(--blue-3)] text-[var(--blue-10)]',
        )}
        type='button'
        onClick={() =>
          onChange({
            includeInFolderStructure: !isFolderField,
            iconKey: !isFolderField ? 'folder' : 'document',
          })
        }
      >
        <Icon
          className='size-3.5'
          name={isFolderField ? 'lucide:folder' : 'lucide:file-text'}
        />
      </button>

      <div className='min-w-0 flex-1'>
        <div className='inline-flex max-w-full items-center gap-0.5'>
          <input
            className='min-w-[4ch] rounded-[8px] border border-transparent bg-transparent px-1 py-0.5 text-[12px] font-semibold text-primary outline-none transition hover:border-border-default focus:border-border-focus focus:bg-surface-secondary'
            maxLength={40}
            style={{
              width: `${Math.max((field.fieldName || '').length, 4) + 1}ch`,
            }}
            value={field.fieldName}
            onChange={(event) =>
              onChange({ fieldName: event.target.value.slice(0, 40) })
            }
          />
          <button
            aria-label={
              field.isMandatory ? 'Mark as optional' : 'Mark as required'
            }
            className={cn(
              'shrink-0 px-0.5 text-[15px] leading-none font-semibold',
              field.isMandatory ? 'text-[var(--error-main)]' : 'text-muted',
            )}
            type='button'
            onClick={() => onChange({ isMandatory: !field.isMandatory })}
          >
            *
          </button>
        </div>
      </div>
    </SortableItem>
  )
}

function MetadataSectionHeader({
  name,
  mandatory,
  folder,
  fieldType,
  onNameChange,
  onMandatoryChange,
  onFolderChange,
  onFieldTypeChange,
  onAdd,
}: {
  name: string
  mandatory: boolean
  folder: boolean
  fieldType: string
  onNameChange: (value: string) => void
  onMandatoryChange: (value: boolean) => void
  onFolderChange: (value: boolean) => void
  onFieldTypeChange: (value: string) => void
  onAdd: () => void
}) {
  return (
    <div className='flex flex-wrap items-end gap-2.5 rounded-[12px] border border-border-default bg-surface-secondary/40 px-3 py-2.5'>
      <div className='min-w-[140px] flex-1'>
        <InputText
          label='Name'
          placeholder='Field name'
          value={name}
          onChange={onNameChange}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              onAdd()
            }
          }}
        />
      </div>
      <div className='w-[150px]'>
        <InputSelect
          classNames={{ input: 'h-8 text-12' }}
          label='Field type'
          options={FIELD_TYPE_OPTIONS}
          value={
            FIELD_TYPE_OPTIONS.find((option) => option.value === fieldType) ||
            FIELD_TYPE_OPTIONS[0]
          }
          width='target'
          onChange={(option) => {
            if (!option?.value) return
            onFieldTypeChange(String(option.value))
          }}
        />
      </div>
      <div className='flex items-center gap-3 pb-2'>
        <InputCheckbox
          checked={mandatory}
          label='Mandatory'
          labelClassName='text-12'
          onChange={onMandatoryChange}
        />
        <InputCheckbox
          checked={folder}
          label='Folder'
          labelClassName='text-12'
          onChange={onFolderChange}
        />
      </div>
      <button
        aria-label='Add field'
        className='mb-0.5 flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-accent-primary text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40'
        disabled={!name.trim()}
        type='button'
        onClick={onAdd}
      >
        <Icon className='size-4' name='lucide:plus' />
      </button>
    </div>
  )
}

function MetadataFieldsPanels({
  hierarchyFields,
  documentFields,
  onChangeField,
  onRemoveField,
  onReorderHierarchy,
  onReorderDocuments,
}: {
  hierarchyFields: EditableField[]
  documentFields: EditableField[]
  onChangeField: (id: string, patch: Partial<EditableField>) => void
  onRemoveField: (id: string) => void
  onReorderHierarchy: (orderedIds: string[]) => void
  onReorderDocuments: (orderedIds: string[]) => void
}) {
  return (
    <div className='space-y-4'>
      <div>
        {hierarchyFields.length > 0 ? (
          <FolderStructureTree
            fields={hierarchyFields}
            onChangeField={onChangeField}
            onRemoveField={onRemoveField}
            onReorder={onReorderHierarchy}
          />
        ) : (
          <InlineAlert tone='info'>
            No folder tree selected yet. Turn on Folder for the fields you want
            in the hierarchy.
          </InlineAlert>
        )}
      </div>

      <div>
        <SortableContainer
          constrainToParent={false}
          items={documentFields.map((field) => field.id)}
          onItemsChange={onReorderDocuments}
        >
          <div className='space-y-2'>
            <AnimatePresence initial={false}>
              {documentFields.map((field) => (
                <motion.div
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  initial={{ opacity: 0, height: 0 }}
                  key={field.id}
                  transition={{ duration: 0.25 }}
                >
                  <MetadataFieldRow
                    field={field}
                    onChange={(patch) => onChangeField(field.id, patch)}
                    onRemove={() => onRemoveField(field.id)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
            {documentFields.length === 0 ? (
              <p className='rounded-[12px] border border-dashed border-border-default px-3 py-4 text-center text-[11px] text-secondary'>
                No document fields yet. Add one above, or turn Folder off on a
                hierarchy field.
              </p>
            ) : null}
          </div>
        </SortableContainer>
      </div>
    </div>
  )
}

function FolderStructureTree({
  fields,
  onChangeField,
  onRemoveField,
  onReorder,
}: {
  fields: EditableField[]
  onChangeField: (id: string, patch: Partial<EditableField>) => void
  onRemoveField: (id: string) => void
  onReorder: (orderedIds: string[]) => void
}) {
  const indentPx = 24

  return (
    <SortableContainer
      constrainToParent={false}
      items={fields.map((field) => field.id)}
      onItemsChange={onReorder}
    >
      <div className='space-y-2'>
        {fields.map((field, index) => (
          <div
            className='relative'
            key={field.id}
            style={{ marginLeft: index * indentPx }}
          >
            {index > 0 ? (
              <span
                aria-hidden
                className='pointer-events-none absolute top-0 left-0'
                style={{
                  width: indentPx,
                  height: '50%',
                  marginLeft: -indentPx,
                }}
              >
                <span className='absolute top-0 left-0 h-full w-px bg-border-default' />
                <span className='absolute bottom-0 left-0 h-px w-full bg-border-default' />
              </span>
            ) : null}
            <MetadataFieldRow
              field={field}
              onChange={(patch) => onChangeField(field.id, patch)}
              onRemove={() => onRemoveField(field.id)}
            />
          </div>
        ))}
      </div>
    </SortableContainer>
  )
}

function CreationProgress({ completedCount }: { completedCount: number }) {
  return (
    <div className='flex flex-col items-center py-6 text-center'>
      <motion.div
        animate={{ scale: [0.96, 1.04, 1] }}
        className='mb-5 flex size-16 items-center justify-center rounded-[18px] bg-accent-soft text-accent-primary'
        transition={{ duration: 1.4, repeat: Infinity }}
      >
        <Icon className='size-7' name='lucide:folder-plus' />
      </motion.div>
      <h2 className='text-[22px] font-semibold text-primary'>
        Creating your folder…
      </h2>
      <p className='mt-2 text-[14px] text-secondary'>
        EZOFIS is applying your configuration.
      </p>
      <ul className='mt-8 w-full max-w-sm space-y-3 text-left'>
        {CREATE_STATUS_STEPS.map((label, index) => {
          const done = index < completedCount
          const active = index === completedCount
          return (
            <li className='flex items-center gap-3' key={label}>
              <span
                className={cn(
                  'flex size-7 items-center justify-center rounded-full border text-[12px]',
                  done &&
                    'border-[var(--green-9)] bg-[var(--green-9)] text-white',
                  active &&
                    'border-accent-primary bg-accent-soft text-accent-primary',
                  !done && !active && 'border-border-default text-muted',
                )}
              >
                {done ? (
                  <Icon className='size-3.5' name='lucide:check' />
                ) : (
                  index + 1
                )}
              </span>
              <span
                className={cn(
                  'text-[14px]',
                  done && 'text-[var(--green-9)]',
                  active && 'font-medium text-primary',
                  !done && !active && 'text-muted',
                )}
              >
                {label}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function FolderSuccessState({
  description: _description,
  fields,
  folderName,
  integrations,
  storage,
  onCreateAnother,
  onOpenFolder,
  onReturn,
}: {
  description: string
  fields: EditableField[]
  folderName: string
  integrations: string
  storage: string
  onCreateAnother: () => void
  onOpenFolder: () => void
  onReturn: () => void
}) {
  const hierarchy = fields.filter((f) => f.includeInFolderStructure)

  return (
    <div className='flex flex-col items-center py-4 text-center'>
      <motion.div
        animate={{ scale: 1 }}
        className='mb-5 flex size-16 items-center justify-center rounded-full bg-success-subtle text-[var(--green-9)]'
        initial={{ scale: 0.7 }}
        transition={{ duration: 0.35 }}
      >
        <Icon className='size-8' name='lucide:check-circle-2' />
      </motion.div>
      <h2 className='text-[24px] font-semibold text-primary'>
        Folder created successfully
      </h2>
      <p className='mt-2 max-w-md text-[14px] text-secondary'>
        <span className='font-semibold text-primary'>{folderName}</span> is ready
        to use.
      </p>

      <div className='mt-6 grid w-full gap-3 text-left sm:grid-cols-2'>
        <div className='rounded-[14px] border border-border-default bg-surface-secondary p-3'>
          <p className='text-[11px] font-semibold text-muted uppercase'>Storage</p>
          <p className='mt-1 text-[14px] font-medium text-primary'>{storage}</p>
        </div>
        <div className='rounded-[14px] border border-border-default bg-surface-secondary p-3'>
          <p className='text-[11px] font-semibold text-muted uppercase'>Metadata</p>
          <p className='mt-1 text-[14px] font-medium text-primary'>
            {fields.length} fields
          </p>
        </div>
        <div className='rounded-[14px] border border-border-default bg-surface-secondary p-3'>
          <p className='text-[11px] font-semibold text-muted uppercase'>
            Hierarchy
          </p>
          <p className='mt-1 text-[14px] font-medium text-primary'>
            {hierarchy.length > 0
              ? hierarchy.map((f) => f.fieldName).join(' → ')
              : 'None'}
          </p>
        </div>
        <div className='rounded-[14px] border border-border-default bg-surface-secondary p-3'>
          <p className='text-[11px] font-semibold text-muted uppercase'>
            Integration
          </p>
          <p className='mt-1 text-[14px] font-medium text-primary'>
            {integrations || 'None'}
          </p>
        </div>
      </div>

      <div className='mt-8 flex w-full flex-col gap-2 sm:flex-row sm:justify-center'>
        <button
          className='rounded-[10px] bg-accent-primary px-5 py-2.5 text-[13px] font-semibold text-white transition hover:opacity-90'
          type='button'
          onClick={onOpenFolder}
        >
          Open Folder
        </button>
        <button
          className='rounded-[10px] border border-border-default bg-surface-primary px-5 py-2.5 text-[13px] font-medium text-primary transition hover:bg-surface-secondary'
          type='button'
          onClick={onCreateAnother}
        >
          Create Another Folder
        </button>
        <button
          className='rounded-[10px] px-5 py-2.5 text-[13px] font-medium text-secondary transition hover:text-primary'
          type='button'
          onClick={onReturn}
        >
          Return to Folder Management
        </button>
      </div>
    </div>
  )
}

export default function AiFolderBuilder({
  onBack,
  onApply,
}: AiFolderBuilderProps) {
  const reduceMotion = useReducedMotion()
  const [stage, setStage] = useState<FlowStage>(1)
  const [completedSteps, setCompletedSteps] = useState<Set<SetupStepId>>(
    () => new Set(),
  )
  const [draftSaved, setDraftSaved] = useState(false)

  const [detailsPhase, setDetailsPhase] = useState<DetailsPhase>('ask')
  const [purpose, setPurpose] = useState('')
  const [showAllPurposeChips, setShowAllPurposeChips] = useState(false)
  const [folderName, setFolderName] = useState('')
  const [description, setDescription] = useState('')
  const [nameError, setNameError] = useState('')
  const [descriptionError, setDescriptionError] = useState('')

  const [storage, setStorage] = useState('EZOFIS Drive')
  const [storageConnected, setStorageConnected] = useState(true)
  const [connectorAccount, setConnectorAccount] = useState('')
  const [testingConnection, setTestingConnection] = useState(false)

  const [fields, setFields] = useState<EditableField[]>([])
  const [fieldsLoading, setFieldsLoading] = useState(false)
  const [metadataRecommendation, setMetadataRecommendation] = useState<
    (typeof METADATA_RECOMMENDATION_OPTIONS)[number]['id']
  >('recommended')
  const [metadataOptionsChosen, setMetadataOptionsChosen] = useState(false)
  const [newFieldName, setNewFieldName] = useState('')
  const [newFieldType, setNewFieldType] = useState('SHORT_TEXT')
  const [newFieldRequired, setNewFieldRequired] = useState(false)
  const [newFieldHierarchy, setNewFieldHierarchy] = useState(false)

  const [versioning, setVersioning] = useState('')
  const [replaceConfirmed, setReplaceConfirmed] = useState(false)

  const [integrations, setIntegrations] = useState('None')
  const [integrationConfig, setIntegrationConfig] = useState({
    apiName: '',
    authType: 'OAuth 2.0',
    baseUrl: '',
    company: '',
    connection: '',
    entity: '',
    method: 'GET',
    syncDirection: 'Bidirectional',
    trigger: 'On document create',
  })

  const [createProgress, setCreateProgress] = useState(0)
  const [aiWorking, setAiWorking] = useState(false)
  const [aiWorkingMessages, setAiWorkingMessages] = useState<string[]>([])
  const [stepInsights, setStepInsights] = useState<Partial<Record<SetupStepId, string>>>(
    {},
  )

  const timelineStep: SetupStepId =
    stage === 'creating' || stage === 'success' ? 6 : stage

  const markComplete = (step: SetupStepId) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev)
      next.add(step)
      return next
    })
  }

  const goToStep = (step: SetupStepId) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev)
      for (const id of Array.from(next)) {
        if (id >= step) next.delete(id)
      }
      return next
    })
    if (step === 1 && folderName.trim()) {
      setDetailsPhase('recommend')
    }
    setStage(step)
  }

  useEffect(() => {
    const id = window.setTimeout(() => setDraftSaved(true), 800)
    return () => window.clearTimeout(id)
  }, [
    folderName,
    description,
    storage,
    fields,
    versioning,
    integrations,
    purpose,
  ])

  useEffect(() => {
    if (storage === 'EZOFIS Drive') {
      setStorageConnected(true)
    } else {
      setStorageConnected(Boolean(connectorAccount.trim()))
    }
  }, [storage, connectorAccount])

  useEffect(() => {
    if (stage !== 3 || fields.length > 0 || fieldsLoading || aiWorking) return
    void regenerateMetadataFields()
  }, [stage, fields.length, fieldsLoading, aiWorking, folderName, purpose, description])

  const runAiBridge = async (messages: string[], work: () => Promise<void>) => {
    setAiWorking(true)
    setAiWorkingMessages(messages)
    try {
      await Promise.all([work(), delay(reduceMotion ? 200 : 900)])
    } finally {
      setAiWorking(false)
      setAiWorkingMessages([])
    }
  }

  useEffect(() => {
    if (stage !== 'creating') return

    let step = 0
    setCreateProgress(0)
    const id = window.setInterval(() => {
      step += 1
      setCreateProgress(step)
      if (step >= CREATE_STATUS_STEPS.length) {
        window.clearInterval(id)
        window.setTimeout(() => setStage('success'), reduceMotion ? 100 : 350)
      }
    }, reduceMotion ? 120 : 420)

    return () => window.clearInterval(id)
  }, [stage, reduceMotion])

  const generateDetails = async (promptOverride?: string) => {
    const prompt = (promptOverride ?? purpose).trim()
    if (!prompt) return

    if (promptOverride) {
      setPurpose(promptOverride)
    }
    setDetailsPhase('processing')
    setNameError('')
    setDescriptionError('')

    try {
      const suggestion = await generateFolderConfig(
        `Create folder details for this business purpose: ${prompt}`,
      )
      setFolderName(suggestion.folderName.slice(0, 100))
      setDescription(suggestion.description.slice(0, 500))
      setDetailsPhase('recommend')
    } catch {
      const fallback = prompt.slice(0, 100)
      setFolderName(fallback)
      setDescription(
        `Repository for ${prompt}. Stores related documents and supporting records.`.slice(
          0,
          500,
        ),
      )
      setDetailsPhase('recommend')
    }
  }

  const acceptDetails = () => {
    const name = folderName.trim()
    const desc = description.trim()
    let valid = true

    if (!name) {
      setNameError('Folder name is required.')
      valid = false
    } else if (name.length > 100) {
      setNameError('Folder name must be 100 characters or fewer.')
      valid = false
    } else {
      setNameError('')
    }

    if (desc.length > 500) {
      setDescriptionError('Description must be 500 characters or fewer.')
      valid = false
    } else {
      setDescriptionError('')
    }

    if (!valid) return

    void runAiBridge(
      [
        'Preparing storage options for your folder…',
        `Matching repositories for “${name}”…`,
        'Choosing the best place to keep these documents…',
      ],
      async () => {
        markComplete(1)
        setStepInsights((prev) => ({
          ...prev,
          2: buildStorageInsight(storage, name),
        }))
        setStage(2)
      },
    )
  }

  const confirmStorage = () => {
    if (!storageConnected) return
    void runAiBridge(
      [
        `Setting up ${storage} for this folder…`,
        'Designing folder hierarchy fields…',
        'Preparing document metadata suggestions…',
      ],
      async () => {
        markComplete(2)
        setFields([])
        setFieldsLoading(true)
        setMetadataOptionsChosen(true)
        setStepInsights((prev) => ({
          ...prev,
          2: buildStorageInsight(storage, folderName),
          3: `Building metadata for “${folderName || 'this folder'}” based on its business purpose.`,
        }))
        setStage(3)
        await regenerateMetadataFields()
        setStepInsights((prev) => ({
          ...prev,
          3: `Suggested metadata fields for “${folderName || 'this folder'}” are ready. Adjust hierarchy or document fields anytime.`,
        }))
      },
    )
  }

  const confirmMetadata = () => {
    if (fields.length === 0 || fieldsLoading) return
    void runAiBridge(
      [
        'Reviewing your metadata structure…',
        'Preparing versioning options…',
      ],
      async () => {
        const recommendation = recommendVersioning(purpose || description)
        setVersioning('')
        setReplaceConfirmed(false)
        setStepInsights((prev) => ({
          ...prev,
          4: recommendation.insight,
        }))
        markComplete(3)
        setStage(4)
      },
    )
  }

  const confirmVersioning = (selectedId?: string) => {
    const chosen = selectedId || versioning
    if (!chosen) return

    void runAiBridge(
      [
        'Checking related business systems…',
        'Preparing integration options…',
      ],
      async () => {
        setVersioning(chosen)
        setReplaceConfirmed(chosen === 'Replace Existing')
        const recommendation = recommendIntegration(purpose || description)
        setIntegrations(recommendation.integrations)
        setStepInsights((prev) => ({
          ...prev,
          5: recommendation.insight,
        }))
        markComplete(4)
        setStage(5)
      },
    )
  }

  const confirmIntegration = () => {
    void runAiBridge(
      [
        'Compiling your folder blueprint…',
        'Preparing the final review summary…',
      ],
      async () => {
        setStepInsights((prev) => ({
          ...prev,
          6: `Ready to create “${folderName || 'your folder'}” with ${fields.length} fields on ${storage}.`,
        }))
        markComplete(5)
        setStage(6)
      },
    )
  }

  const reviewIssues = useMemo(() => {
    const issues: string[] = []
    if (!folderName.trim()) issues.push('Folder name is missing.')
    if (!storageConnected) issues.push('Storage connection is incomplete.')
    if (fields.length === 0) issues.push('Add at least one metadata field.')
    if (!versioning.trim()) issues.push('Choose a versioning option.')
    return issues
  }, [
    folderName,
    storageConnected,
    fields.length,
    versioning,
  ])

  const createFolder = () => {
    if (reviewIssues.length > 0) return
    markComplete(6)
    setStage('creating')
  }

  const buildPayload = (): AiFolderBuilderApplyPayload => ({
    description: description.trim(),
    fields: stripEditableIds(fields),
    folderName: folderName.trim(),
    integrations,
    storage,
    versioning,
  })

  const resetFlow = () => {
    setStage(1)
    setCompletedSteps(new Set())
    setDetailsPhase('ask')
    setPurpose('')
    setFolderName('')
    setDescription('')
    setNameError('')
    setDescriptionError('')
    setStorage('EZOFIS Drive')
    setStorageConnected(true)
    setConnectorAccount('')
    setFields([])
    setMetadataOptionsChosen(false)
    setVersioning('')
    setReplaceConfirmed(false)
    setIntegrations('None')
    setCreateProgress(0)
  }

  const updateField = (id: string, patch: Partial<EditableField>) => {
    setFields((prev) => {
      const next = prev.map((field) =>
        field.id === id ? { ...field, ...patch } : field,
      )
      return 'includeInFolderStructure' in patch
        ? sortFieldsByType(next)
        : next
    })
  }

  const addField = () => {
    const name = newFieldName.trim()
    if (!name) return
    setFields((prev) =>
      sortFieldsByType([
        ...prev,
        {
          aiGenerated: false,
          dataType: newFieldType,
          fieldName: name.slice(0, 40),
          iconKey: newFieldHierarchy ? 'folder' : 'document',
          id: crypto.randomUUID(),
          includeInFolderStructure: newFieldHierarchy,
          isMandatory: newFieldRequired,
        },
      ]),
    )
    setNewFieldName('')
    setNewFieldType('SHORT_TEXT')
    setNewFieldRequired(false)
    setNewFieldHierarchy(false)
  }

  const testConnection = async () => {
    setTestingConnection(true)
    await new Promise((resolve) => window.setTimeout(resolve, 400))
    if (!connectorAccount.trim()) {
      setConnectorAccount('connected.user@company.com')
    }
    setStorageConnected(true)
    setTestingConnection(false)
  }

  const regenerateMetadataFields = async (
    recommendationId: (typeof METADATA_RECOMMENDATION_OPTIONS)[number]['id'] = metadataRecommendation,
  ) => {
    const recommendation =
      METADATA_RECOMMENDATION_OPTIONS.find((item) => item.id === recommendationId) ||
      METADATA_RECOMMENDATION_OPTIONS[0]

    setMetadataRecommendation(recommendation.id)
    setMetadataOptionsChosen(true)
    setFieldsLoading(true)
    setFields([])

    try {
      const suggestion = await Promise.race([
        generateFolderConfig(
          `Folder: ${folderName || 'Untitled folder'}. Purpose: ${purpose || description}. ${recommendation.prompt}`,
        ),
        new Promise<never>((_, reject) =>
          window.setTimeout(() => reject(new Error('metadata-timeout')), 3200),
        ),
      ])

      if (suggestion.fields?.length) {
        setFields(toEditableFields(suggestion.fields))
      } else {
        setFields(toEditableFields(DEFAULT_METADATA_FIELDS))
      }
    } catch {
      setFields(toEditableFields(DEFAULT_METADATA_FIELDS))
    } finally {
      setFieldsLoading(false)
    }
  }

  const requiredCount = fields.filter((field) => field.isMandatory).length
  const hierarchyFields = fields.filter(
    (field) => field.includeInFolderStructure,
  )
  const documentFields = fields.filter(
    (field) => !field.includeInFolderStructure,
  )

  const continueDisabled =
    aiWorking ||
    (stage === 2 && !storageConnected) ||
    (stage === 3 && (fieldsLoading || fields.length === 0)) ||
    (stage === 4 && !versioning.trim()) ||
    (stage === 6 && reviewIssues.length > 0)

  const handleContinue = () => {
    if (stage === 2) confirmStorage()
    else if (stage === 3) confirmMetadata()
    else if (stage === 4) confirmVersioning()
    else if (stage === 5) confirmIntegration()
    else if (stage === 6) createFolder()
  }

  const stepMeta: Record<
    SetupStepId,
    { question: string; support: string }
  > = {
    1: {
      question:
        'What business process or document collection will this folder manage?',
      support:
        stepInsights[1] ||
        'Describe it in your own words. We’ll suggest a clear folder name and business description.',
    },
    2: {
      question: 'Where should the documents be stored?',
      support:
        stepInsights[2] ||
        'Pick the storage location EZOFIS should use for this folder.',
    },
    3: {
      question:
        'What information should be captured for documents in this folder?',
      support:
        stepInsights[3] ||
        'Suggested fields are based on the purpose of this folder. Adjust them as needed.',
    },
    4: {
      question: 'How should EZOFIS handle an updated file?',
      support:
        stepInsights[4] ||
        'Choose what happens when a file with the same name already exists.',
    },
    5: {
      question: 'Should this folder connect with another business system?',
      support:
        stepInsights[5] ||
        'This is optional. You can connect a system now or configure it later.',
    },
    6: {
      question: 'Everything is ready. Would you like to create this folder?',
      support:
        stepInsights[6] ||
        'Review the configuration below before creating the repository.',
    },
  }

  const getSummary = (stepId: SetupStepId) => {
    if (stepId === 1) {
      return {
        title: 'Folder details',
        headline: folderName || 'Untitled folder',
        detail: description || purpose || 'Describe the folder purpose',
        stats: [
          { label: 'Name', value: folderName || 'Not set' },
          {
            label: 'Purpose',
            value: (purpose || description || 'Pending').slice(0, 42),
          },
        ],
        chips: purpose ? [purpose.slice(0, 28)] : ['Details'],
      }
    }
    if (stepId === 2) {
      return {
        title: 'Storage',
        headline: storage || 'Choose storage',
        detail: storageConnected
          ? 'Storage is connected and ready'
          : 'Connection required before continuing',
        stats: [
          { label: 'Drive', value: storage || '—' },
          {
            label: 'Status',
            value: storageConnected ? 'Connected' : 'Not connected',
          },
        ],
        chips: [storageConnected ? 'Connected' : 'Setup needed'],
      }
    }
    if (stepId === 3) {
      const fieldChips = fields.slice(0, 4).map((field) => field.fieldName)
      return {
        title: 'Metadata',
        headline: fields.length
          ? `${fields.length} fields configured`
          : 'Preparing suggested fields',
        detail:
          hierarchyFields.length > 0
            ? hierarchyFields.map((field) => field.fieldName).join(' → ')
            : 'Hierarchy based on your folder purpose',
        stats: [
          { label: 'Fields', value: String(fields.length) },
          { label: 'Required', value: String(requiredCount) },
          {
            label: 'Folders',
            value: String(hierarchyFields.length),
          },
        ],
        chips: fieldChips.length ? fieldChips : ['Metadata'],
      }
    }
    if (stepId === 4) {
      return {
        title: 'Versioning',
        headline: versioning || 'Choose a strategy',
        detail: 'How updates are handled for the same file name',
        stats: [
          { label: 'Policy', value: versioning || 'Not selected' },
          {
            label: 'Mode',
            value:
              versioning === 'Replace Existing'
                ? 'Overwrite'
                : versioning
                  ? 'Keep history'
                  : 'Pending',
          },
        ],
        chips: versioning ? [versioning] : ['Versioning'],
      }
    }
    if (stepId === 5) {
      return {
        title: 'Integration',
        headline: integrations || 'None',
        detail:
          integrations && integrations !== 'None'
            ? 'External system connection selected'
            : 'Optional — skip if not needed',
        stats: [
          { label: 'System', value: integrations || 'None' },
          {
            label: 'Required',
            value: 'Optional',
          },
        ],
        chips: [integrations || 'None'],
      }
    }
    return {
      title: 'Review',
      headline:
        reviewIssues.length === 0 ? 'Ready to create' : 'Needs attention',
      detail: folderName
        ? `${folderName} · ${fields.length} fields · ${storage}`
        : 'Finish earlier steps to create the folder',
      stats: [
        { label: 'Folder', value: folderName || '—' },
        { label: 'Fields', value: String(fields.length) },
        { label: 'Storage', value: storage || '—' },
      ],
      chips:
        reviewIssues.length === 0
          ? ['Ready', versioning || 'Versioning', integrations || 'None']
          : ['Fix issues'],
    }
  }

  const renderActiveBody = () => {
    if (aiWorking) {
      return (
        <AiProcessingState
          label={aiWorkingMessages[0] || 'Preparing your next step…'}
          messages={aiWorkingMessages}
        />
      )
    }

    if (stage === 1) {
      const visiblePurposeChips = showAllPurposeChips
        ? PURPOSE_CHIPS
        : PURPOSE_CHIPS.slice(0, 4)
      const hiddenPurposeCount = PURPOSE_CHIPS.length - visiblePurposeChips.length

      return (
        <>
          {detailsPhase === 'ask' ? (
            <div className='space-y-3'>
              <HiddenScrollRow>
                {visiblePurposeChips.map((chip) => (
                  <button
                    className={cn(
                      'shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium transition hover:border-border-focus',
                      purpose === chip
                        ? 'border-accent-primary bg-accent-soft text-accent-primary'
                        : 'border-border-default bg-surface-primary text-secondary',
                    )}
                    key={chip}
                    type='button'
                    onClick={() => void generateDetails(chip)}
                  >
                    {chip}
                  </button>
                ))}
                {!showAllPurposeChips && hiddenPurposeCount > 0 ? (
                  <button
                    className='shrink-0 rounded-full border border-border-default px-2.5 py-1 text-[11px] font-medium text-accent-primary transition hover:bg-accent-soft'
                    type='button'
                    onClick={() => setShowAllPurposeChips(true)}
                  >
                    More (+{hiddenPurposeCount})
                  </button>
                ) : null}
                {showAllPurposeChips ? (
                  <button
                    className='shrink-0 rounded-full border border-border-default px-2.5 py-1 text-[11px] font-medium text-secondary transition hover:bg-surface-secondary'
                    type='button'
                    onClick={() => setShowAllPurposeChips(false)}
                  >
                    Less
                  </button>
                ) : null}
              </HiddenScrollRow>
              <InputTextarea
                minRows={3}
                placeholder='Example: A repository for supplier invoices, purchase orders, payment records and supporting documents.'
                resize='vertical'
                rows={3}
                value={purpose}
                onChange={setPurpose}
              />
            </div>
          ) : null}

          {detailsPhase === 'processing' ? (
            <AiProcessingState
              label='Preparing your folder configuration…'
              messages={[
                'Reading your business purpose…',
                'Drafting a clear folder name…',
                'Writing a searchable business description…',
              ]}
            />
          ) : null}

          {detailsPhase === 'recommend' ? (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className='space-y-3'
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              transition={{ duration: 0.25 }}
            >
              <InputText
                error={nameError || undefined}
                label='Suggested folder name'
                value={folderName}
                onChange={(value) => {
                  setFolderName(value.slice(0, 100))
                  setNameError('')
                }}
              />

              <InputTextarea
                error={descriptionError || undefined}
                label='Suggested business description'
                minRows={3}
                resize='vertical'
                rows={3}
                value={description}
                onChange={(value) => {
                  setDescription(value.slice(0, 500))
                  setDescriptionError('')
                }}
              />
            </motion.div>
          ) : null}
        </>
      )
    }

    if (stage === 2) {
      const selectedStorageOption =
        STORAGE_OPTIONS.find((option) => option.id === storage) ||
        STORAGE_OPTIONS[0]

      return (
        <div className='space-y-3'>
          <div className='mt-2 grid grid-cols-3 gap-2.5'>
            {STORAGE_OPTIONS.map((option) => (
              <motion.button
                whileHover={reduceMotion ? undefined : { scale: 1.02 }}
                whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                className={cn(
                  'flex min-h-[86px] flex-col items-center justify-center rounded-[12px] border px-3 py-2 text-center transition',
                  storage === option.id
                    ? 'border-accent-primary bg-accent-soft text-accent-primary'
                    : 'border-border-default bg-surface-primary text-secondary hover:border-border-focus',
                )}
                key={option.id}
                type='button'
                onClick={() => {
                  setStorage(option.id)
                  setStepInsights((prev) => ({
                    ...prev,
                    2: buildStorageInsight(option.id, folderName),
                  }))
                }}
              >
                <span
                  className={cn(
                    'mb-1.5 flex size-8 items-center justify-center rounded-[8px]',
                    storage === option.id
                      ? 'bg-transparent'
                      : 'bg-surface-secondary',
                  )}
                >
                  {option.logo || option.id === 'EZOFIS Drive' ? (
                    <img
                      alt={option.title}
                      className='size-4 object-contain'
                      src={option.logo || '/favicon.svg'}
                    />
                  ) : (
                    <Icon className='size-4' name={option.icon} />
                  )}
                </span>
                <span className='text-[11px] font-semibold leading-tight'>
                  {option.id === 'One Drive' ? 'OneDrive' : option.title}
                </span>
              </motion.button>
            ))}
          </div>

          <AnimatePresence mode='wait' initial={false}>
            {selectedStorageOption.id !== 'EZOFIS Drive' ? (
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className='space-y-3 rounded-[12px] border border-border-default bg-surface-primary p-3'
                exit={{ opacity: 0, y: -8 }}
                initial={{ opacity: 0, y: 8 }}
                key={selectedStorageOption.id}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                <div>
                  <label className='mb-1 block text-[11px] font-semibold text-secondary'>
                    Connector
                  </label>
                  <select
                    className='w-full rounded-[10px] border border-border-default bg-surface-primary px-3 py-2 text-[12px] text-primary outline-none focus:border-border-focus'
                    defaultValue='default'
                  >
                    <option value='default'>
                      Default {selectedStorageOption.title} connector
                    </option>
                    <option value='new'>Add new connector…</option>
                  </select>
                </div>
                <div>
                  <label className='mb-1 block text-[11px] font-semibold text-secondary'>
                    Connected account
                  </label>
                  <input
                    className='w-full rounded-[10px] border border-border-default px-3 py-2 text-[12px] outline-none focus:border-border-focus'
                    placeholder='user@company.com'
                    value={connectorAccount}
                    onChange={(event) => setConnectorAccount(event.target.value)}
                  />
                </div>
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <span
                    className={cn(
                      'text-[11px] font-medium',
                      storageConnected
                        ? 'text-[var(--green-9)]'
                        : 'text-[var(--warning-main)]',
                    )}
                  >
                    {storageConnected
                      ? 'Connection status: Connected'
                      : 'Connection status: Not connected'}
                  </span>
                  <button
                    className='rounded-[8px] border border-border-default px-3 py-1 text-[11px] font-medium text-primary transition hover:bg-surface-secondary disabled:opacity-50'
                    disabled={testingConnection}
                    type='button'
                    onClick={() => void testConnection()}
                  >
                    {testingConnection ? 'Testing…' : 'Test Connection'}
                  </button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      )
    }

    if (stage === 3) {
      if (fieldsLoading) {
        return (
          <AiProcessingState
            label='Generating metadata fields…'
            messages={[
              'Mapping folder hierarchy levels…',
              'Selecting document metadata fields…',
              'Marking required fields for capture…',
            ]}
          />
        )
      }

      if (!metadataOptionsChosen) {
        return (
          <div className='space-y-4'>
            <HiddenScrollRow>
              {METADATA_RECOMMENDATION_OPTIONS.map((option) => (
                <button
                  className='shrink-0 rounded-full border border-border-default bg-surface-primary px-2.5 py-1 text-[11px] font-medium text-secondary transition hover:border-border-focus hover:text-primary'
                  key={option.id}
                  type='button'
                  onClick={() => void regenerateMetadataFields(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </HiddenScrollRow>
          </div>
        )
      }

      return (
        <div className='space-y-4'>
          <MetadataSectionHeader
            fieldType={newFieldType}
            folder={newFieldHierarchy}
            mandatory={newFieldRequired}
            name={newFieldName}
            onAdd={addField}
            onFieldTypeChange={setNewFieldType}
            onFolderChange={setNewFieldHierarchy}
            onMandatoryChange={setNewFieldRequired}
            onNameChange={setNewFieldName}
          />

          <MetadataFieldsPanels
            documentFields={documentFields}
            hierarchyFields={hierarchyFields}
            onChangeField={updateField}
            onRemoveField={(id) =>
              setFields((prev) => prev.filter((item) => item.id !== id))
            }
            onReorderDocuments={(ids) => {
              const map = new Map(fields.map((field) => [field.id, field]))
              const reorderedDocs = ids
                .map((id) => map.get(id))
                .filter(Boolean) as EditableField[]
              const hierarchy = fields.filter(
                (field) => field.includeInFolderStructure,
              )
              setFields([...hierarchy, ...reorderedDocs])
            }}
            onReorderHierarchy={(orderedIds) => {
              const map = new Map(fields.map((field) => [field.id, field]))
              const reorderedHierarchy = orderedIds
                .map((id) => map.get(id))
                .filter(Boolean) as EditableField[]
              const docs = fields.filter(
                (field) => !field.includeInFolderStructure,
              )
              setFields([...reorderedHierarchy, ...docs])
            }}
          />
        </div>
      )
    }

    if (stage === 4) {
      const versioningIcons: Record<string, string> = {
        'Incremental Version': 'lucide:git-branch',
        'Timestamp Version': 'lucide:clock-3',
        'Replace Existing': 'lucide:replace',
      }

      return (
        <div className='mt-2 grid grid-cols-3 gap-2.5'>
          {VERSIONING_OPTIONS.map((option, index) => (
            <motion.button
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={cn(
                'flex min-h-[110px] flex-col items-center justify-center rounded-[12px] border px-3 py-3 text-center transition',
                versioning === option.id
                  ? 'border-accent-primary bg-accent-soft text-accent-primary'
                  : 'border-border-default bg-surface-primary text-secondary hover:border-border-focus',
              )}
              initial={
                reduceMotion ? false : { opacity: 0, y: 18, scale: 0.96 }
              }
              key={option.id}
              transition={{
                delay: 0.08 + index * 0.1,
                duration: 0.4,
                ease: [0.22, 1, 0.36, 1],
              }}
              type='button'
              whileHover={reduceMotion ? undefined : { scale: 1.02 }}
              whileTap={reduceMotion ? undefined : { scale: 0.98 }}
              onClick={() => void confirmVersioning(option.id)}
            >
              <span
                className={cn(
                  'mb-2 flex size-10 items-center justify-center rounded-[10px]',
                  versioning === option.id
                    ? 'bg-transparent text-accent-primary'
                    : 'bg-surface-secondary text-secondary',
                )}
              >
                <Icon
                  className='size-5'
                  name={versioningIcons[option.id] || 'lucide:git-branch'}
                />
              </span>
              <span className='text-[12px] font-semibold leading-tight text-primary'>
                {option.title}
              </span>
              <span className='mt-1 line-clamp-2 text-[10px] leading-snug text-secondary'>
                {option.description}
              </span>
            </motion.button>
          ))}
        </div>
      )
    }

    if (stage === 5) {
      return (
        <div className='space-y-3'>
          <div className='grid gap-3 sm:grid-cols-2'>
            {INTEGRATION_OPTIONS.map((option, index) => (
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                key={option.id}
                transition={{ delay: index * 0.05, duration: 0.25 }}
              >
                <OptionCard
                  description={option.description}
                  icon={option.icon}
                  selected={integrations === option.id}
                  title={option.title}
                  onSelect={() => setIntegrations(option.id)}
                >
                  {integrations === option.id && option.id !== 'None' ? (
                    <div className='space-y-2'>
                  {option.id === 'Custom API' ? (
                    <>
                      <input
                        className='w-full rounded-[10px] border border-border-default px-3 py-2 text-[13px] outline-none focus:border-border-focus'
                        placeholder='API name'
                        value={integrationConfig.apiName}
                        onChange={(event) =>
                          setIntegrationConfig((prev) => ({
                            ...prev,
                            apiName: event.target.value,
                          }))
                        }
                      />
                      <input
                        className='w-full rounded-[10px] border border-border-default px-3 py-2 text-[13px] outline-none focus:border-border-focus'
                        placeholder='Base URL'
                        value={integrationConfig.baseUrl}
                        onChange={(event) =>
                          setIntegrationConfig((prev) => ({
                            ...prev,
                            baseUrl: event.target.value,
                          }))
                        }
                      />
                      <select
                        className='w-full rounded-[10px] border border-border-default px-3 py-2 text-[13px] outline-none focus:border-border-focus'
                        value={integrationConfig.authType}
                        onChange={(event) =>
                          setIntegrationConfig((prev) => ({
                            ...prev,
                            authType: event.target.value,
                          }))
                        }
                      >
                        <option>OAuth 2.0</option>
                        <option>API Key</option>
                        <option>Bearer Token</option>
                      </select>
                      <select
                        className='w-full rounded-[10px] border border-border-default px-3 py-2 text-[13px] outline-none focus:border-border-focus'
                        value={integrationConfig.method}
                        onChange={(event) =>
                          setIntegrationConfig((prev) => ({
                            ...prev,
                            method: event.target.value,
                          }))
                        }
                      >
                        <option>GET</option>
                        <option>POST</option>
                        <option>PUT</option>
                      </select>
                    </>
                  ) : (
                    <>
                      <input
                        className='w-full rounded-[10px] border border-border-default px-3 py-2 text-[13px] outline-none focus:border-border-focus'
                        placeholder='Connection'
                        value={integrationConfig.connection}
                        onChange={(event) =>
                          setIntegrationConfig((prev) => ({
                            ...prev,
                            connection: event.target.value,
                          }))
                        }
                      />
                      <input
                        className='w-full rounded-[10px] border border-border-default px-3 py-2 text-[13px] outline-none focus:border-border-focus'
                        placeholder='Company or tenant'
                        value={integrationConfig.company}
                        onChange={(event) =>
                          setIntegrationConfig((prev) => ({
                            ...prev,
                            company: event.target.value,
                          }))
                        }
                      />
                      <select
                        className='w-full rounded-[10px] border border-border-default px-3 py-2 text-[13px] outline-none focus:border-border-focus'
                        value={integrationConfig.syncDirection}
                        onChange={(event) =>
                          setIntegrationConfig((prev) => ({
                            ...prev,
                            syncDirection: event.target.value,
                          }))
                        }
                      >
                        <option>Bidirectional</option>
                        <option>Inbound</option>
                        <option>Outbound</option>
                      </select>
                      <input
                        className='w-full rounded-[10px] border border-border-default px-3 py-2 text-[13px] outline-none focus:border-border-focus'
                        placeholder='Entity or module'
                        value={integrationConfig.entity}
                        onChange={(event) =>
                          setIntegrationConfig((prev) => ({
                            ...prev,
                            entity: event.target.value,
                          }))
                        }
                      />
                    </>
                  )}
                </div>
              ) : null}
                </OptionCard>
              </motion.div>
            ))}
          </div>
        </div>
      )
    }

    return (
      <div className='space-y-3'>
        {reviewIssues.length === 0 ? (
          <InlineAlert tone='success'>
            <span className='inline-flex items-center gap-1.5'>
              <Icon className='size-3.5' name='lucide:check' />
              Ready to create
            </span>
          </InlineAlert>
        ) : (
          <InlineAlert tone='error'>{reviewIssues.join(' ')}</InlineAlert>
        )}

        {(
          [
            {
              body: (
                <>
                  <p className='font-medium text-primary'>{folderName}</p>
                  <p className='mt-1 text-secondary'>{description}</p>
                </>
              ),
              step: 1 as SetupStepId,
              title: 'Folder Details',
            },
            {
              body: (
                <p className='text-primary'>
                  {storage} · {storageConnected ? 'Connected' : 'Not connected'}
                </p>
              ),
              step: 2 as SetupStepId,
              title: 'Storage',
            },
            {
              body: (
                <MetadataFieldsPanels
                  documentFields={documentFields}
                  hierarchyFields={hierarchyFields}
                  onChangeField={updateField}
                  onRemoveField={(id) =>
                    setFields((prev) => prev.filter((item) => item.id !== id))
                  }
                  onReorderDocuments={(ids) => {
                    const map = new Map(fields.map((field) => [field.id, field]))
                    const reorderedDocs = ids
                      .map((id) => map.get(id))
                      .filter(Boolean) as EditableField[]
                    const hierarchy = fields.filter(
                      (field) => field.includeInFolderStructure,
                    )
                    setFields([...hierarchy, ...reorderedDocs])
                  }}
                  onReorderHierarchy={(orderedIds) => {
                    const map = new Map(fields.map((field) => [field.id, field]))
                    const reorderedHierarchy = orderedIds
                      .map((id) => map.get(id))
                      .filter(Boolean) as EditableField[]
                    const docs = fields.filter(
                      (field) => !field.includeInFolderStructure,
                    )
                    setFields([...reorderedHierarchy, ...docs])
                  }}
                />
              ),
              step: 3 as SetupStepId,
              title: 'Metadata',
            },
            {
              body: <p className='text-primary'>{versioning}</p>,
              step: 4 as SetupStepId,
              title: 'Versioning',
            },
            {
              body: <p className='text-primary'>{integrations || 'None'}</p>,
              step: 5 as SetupStepId,
              title: 'Integration',
            },
          ] as const
        ).map((section) => (
          <div
            className='rounded-[14px] border border-border-default bg-surface-secondary p-3.5'
            key={section.title}
          >
            <div className='mb-2 flex items-center justify-between gap-2'>
              <p className='text-[12px] font-semibold text-secondary'>
                {section.title}
              </p>
              <button
                className='text-[12px] font-medium text-accent-primary transition hover:opacity-80'
                type='button'
                onClick={() => goToStep(section.step)}
              >
                Edit
              </button>
            </div>
            <div className='text-[13px]'>{section.body}</div>
          </div>
        ))}
      </div>
    )
  }

  const renderActiveFooter = () => {
    if (aiWorking) return null
    if (stage === 1 && detailsPhase === 'processing') return null
    if (stage === 3 && fieldsLoading) return null
    if (stage === 4) return null

    if (stage === 1 && detailsPhase === 'ask') {
      return (
        <CompactNextButton
          disabled={!purpose.trim()}
          onClick={() => void generateDetails()}
        />
      )
    }

    if (stage === 1 && detailsPhase === 'recommend') {
      return <CompactNextButton onClick={acceptDetails} />
    }

    if (typeof stage === 'number' && stage >= 2 && stage <= 6) {
      return (
        <CompactNextButton
          disabled={continueDisabled}
          label={stage === 6 ? 'Create >>' : 'Next >>'}
          onClick={handleContinue}
        />
      )
    }

    return null
  }

  return (
    <div className='relative flex h-full min-h-0 flex-col overflow-hidden bg-dashboard'>
      <div
        aria-hidden
        className='pointer-events-none absolute inset-0 overflow-hidden'
      >
        <div className='absolute -top-24 -left-16 size-72 rounded-full bg-accent-soft opacity-40 blur-3xl' />
        <div className='absolute top-1/3 -right-20 size-80 rounded-full bg-[var(--cyan-3)] opacity-35 blur-3xl' />
        <div className='absolute -bottom-24 left-1/3 size-72 rounded-full bg-success-subtle opacity-40 blur-3xl' />
      </div>

      <div className='relative z-10 flex min-h-0 flex-1 flex-col'>
        <FolderCreationHeader draftSaved={draftSaved} onSaveExit={onBack} />

        <SetupTimeline
          completedSteps={
            stage === 'creating' || stage === 'success'
              ? (new Set([1, 2, 3, 4, 5, 6]) as Set<SetupStepId>)
              : completedSteps
          }
          currentStep={timelineStep}
        />

        {stage === 'creating' || stage === 'success' ? (
          <div className='mx-auto flex w-full max-w-[920px] flex-1 items-center px-4 py-4 sm:px-6'>
            <div className='w-full rounded-[22px] border border-border-default bg-surface-primary p-5 shadow-[0_10px_40px_rgba(15,23,42,0.06)] sm:min-h-[430px] sm:p-8'>
              {stage === 'creating' ? (
                <CreationProgress completedCount={createProgress} />
              ) : (
                <FolderSuccessState
                  description={description}
                  fields={fields}
                  folderName={folderName}
                  integrations={integrations}
                  storage={storage}
                  onCreateAnother={resetFlow}
                  onOpenFolder={() => onApply(buildPayload())}
                  onReturn={onBack}
                />
              )}
            </div>
          </div>
        ) : (
          <StepCarousel
            activeContent={renderActiveBody()}
            activeFooter={renderActiveFooter()}
            canGoNext={
              !aiWorking &&
              !fieldsLoading &&
              stage !== 4 &&
              ((stage === 1 &&
                detailsPhase === 'ask' &&
                Boolean(purpose.trim())) ||
              (stage === 1 &&
                detailsPhase === 'recommend' &&
                Boolean(folderName.trim())) ||
              (typeof stage === 'number' &&
                stage >= 2 &&
                stage <= 5 &&
                !continueDisabled) ||
              (stage === 6 && !continueDisabled))
            }
            completedSteps={completedSteps}
            currentStep={timelineStep}
            getSummary={getSummary}
            question={stepMeta[timelineStep].question}
            support={stepMeta[timelineStep].support}
            onGoToStep={goToStep}
            onNext={() => {
              if (stage === 1 && detailsPhase === 'ask') {
                void generateDetails()
              } else if (stage === 1 && detailsPhase === 'recommend') {
                acceptDetails()
              } else {
                handleContinue()
              }
            }}
          />
        )}
      </div>
    </div>
  )
}
