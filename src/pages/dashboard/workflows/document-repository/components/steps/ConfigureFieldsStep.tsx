import { useMemo, useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Option } from '@/types/option'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import InputCheckbox from '@/components/base/inputs/InputCheckbox'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputText from '@/components/base/inputs/InputText'
import SortableContainer from '@/components/base/sortable/SortableContainer'
import {
  StepFooter,
  StepLayout,
} from '@/pages/dashboard/workflows/accounts-payable/components/setup/components/steps/components/StepLayout'
import { DynamicIcon } from '@/pages/folders/components/icons'
import cn from '@/utils/cn'
import {
  FOLDER_FIELD_ICON_KEYS,
  FOLDER_FIELD_ICON_LABELS,
  formatDataTypeLabel,
  REPOSITORY_FIELD_DATA_TYPES,
  toFieldTypeOptions,
} from '../../folderSetupShared'
import useDmsSetupStore, {
  type DmsSetupField,
} from '../../stores/useDmsSetupStore'

const FIELD_TREE_STEP = 24
const FIELD_TABLE_COLS =
  'grid-cols-[28px_minmax(0,1fr)_minmax(120px,140px)_minmax(72px,max-content)_minmax(88px,max-content)_40px] gap-x-1.5'

const folderIconOptions = FOLDER_FIELD_ICON_KEYS.map((key) => ({
  iconKey: key,
  id: key,
  name: FOLDER_FIELD_ICON_LABELS[key],
  value: key,
}))

const recalculateFieldHierarchy = (
  orderedFields: DmsSetupField[],
): DmsSetupField[] => {
  const folderFields = orderedFields.filter(
    (field) => field.includeInFolderStructure,
  )
  const metadataFields = orderedFields.filter(
    (field) => !field.includeInFolderStructure,
  )
  const normalized = [...folderFields, ...metadataFields]
  let folderLevel = 0

  return normalized.map((field, index) => {
    if (field.includeInFolderStructure) {
      folderLevel += 1
      return {
        ...field,
        level: folderLevel,
        orderId: index + 1,
      }
    }

    return {
      ...field,
      level: 0,
      orderId: index + 1,
    }
  })
}

type DisplayField = DmsSetupField & {
  depth: number
  isFileNameField: boolean
  isLastAtDepth: boolean
}

const buildDisplayRows = (fields: DmsSetupField[]): DisplayField[] => {
  const sorted = recalculateFieldHierarchy(fields)
  const folderFields = sorted.filter((field) => field.includeInFolderStructure)
  const fileNameFieldId = folderFields[folderFields.length - 1]?.id

  const withDepth = sorted.map((field) => {
    const isFileNameField =
      field.includeInFolderStructure && field.id === fileNameFieldId

    return {
      ...field,
      depth: field.includeInFolderStructure ? Math.max(0, field.level - 1) : 0,
      isFileNameField,
    }
  })

  return withDepth.map((field, index) => {
    const depth = field.depth
    let isLastAtDepth = true

    for (
      let nextIndex = index + 1;
      nextIndex < withDepth.length;
      nextIndex += 1
    ) {
      if (withDepth[nextIndex].depth < depth) break
      if (withDepth[nextIndex].depth === depth) {
        isLastAtDepth = false
        break
      }
    }

    return {
      ...field,
      isLastAtDepth,
    }
  })
}

function FieldTreeLines({
  depth,
  isLastAtDepth,
}: {
  depth: number
  isLastAtDepth: boolean
}) {
  if (depth === 0) return null

  return (
    <div
      className='relative shrink-0 self-stretch'
      style={{
        marginLeft: (depth - 1) * FIELD_TREE_STEP,
        width: FIELD_TREE_STEP,
      }}
    >
      <span
        className='absolute top-0 left-1/2 w-px -translate-x-1/2 bg-gray-5'
        style={{ height: '50%' }}
      />
      <span
        className='absolute top-1/2 left-1/2 h-px bg-gray-5'
        style={{ width: FIELD_TREE_STEP / 2 }}
      />
      {!isLastAtDepth ? (
        <span className='absolute top-1/2 bottom-0 left-1/2 w-px -translate-x-1/2 bg-gray-5' />
      ) : null}
    </div>
  )
}

function FieldTreeIcon({
  iconKey,
  variant,
}: {
  iconKey: string
  variant: 'folder' | 'fileName' | 'metadata'
}) {
  return (
    <span
      className={cn(
        'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded',
        variant === 'folder' && 'bg-primary-3 text-primary-9',
        variant === 'fileName' && 'bg-blue-3 text-blue-9',
        variant === 'metadata' && 'bg-gray-3 text-gray-11',
      )}
    >
      <DynamicIcon className='h-2.5 w-2.5' name={iconKey} />
    </span>
  )
}

function SortableFieldRow({
  field,
  fieldTypeOptions,
  onDelete,
  onToggleFolder,
  onUpdate,
}: {
  field: DisplayField
  fieldTypeOptions: Option[]
  onDelete: (id: string) => void
  onToggleFolder: (id: string, checked: boolean) => void
  onUpdate: (id: string, patch: Partial<DmsSetupField>) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: field.id })

  const isFolder = field.includeInFolderStructure
  const variant = !isFolder
    ? 'metadata'
    : field.isFileNameField
      ? 'fileName'
      : 'folder'
  const iconKey = field.isFileNameField
    ? 'document'
    : !isFolder
      ? 'tag'
      : field.iconKey &&
          field.iconKey !== 'document' &&
          field.iconKey !== 'tag'
        ? field.iconKey
        : 'folder'

  return (
    <div
      className={cn(
        'grid items-center px-3 py-2.5',
        FIELD_TABLE_COLS,
        !isFolder && 'bg-gray-1/70',
      )}
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <button
        aria-label={`Drag ${field.fieldName}`}
        className='-mr-0.5 flex size-6 cursor-grab items-center justify-center rounded text-gray-9 outline-primary-8 transition-colors hover:bg-gray-4 active:cursor-grabbing'
        type='button'
        {...attributes}
        {...listeners}
      >
        <Icon className='size-3.5' name='lucide:grip-vertical' />
      </button>

      <div className='flex min-w-0 items-center gap-1.5'>
        {isFolder ? (
          <FieldTreeLines
            depth={field.depth}
            isLastAtDepth={field.isLastAtDepth}
          />
        ) : null}
        <FieldTreeIcon iconKey={iconKey} variant={variant} />
        <div className='min-w-0 flex-1'>
          <InputText
            value={field.fieldName}
            onChange={(value) => onUpdate(field.id, { fieldName: value })}
          />
        </div>
      </div>

      <InputSelect
        options={fieldTypeOptions}
        placeholder='Type'
        searchable
        searchPlaceholder='Search type'
        width='target'
        value={
          fieldTypeOptions.find((option) => option.value === field.dataType) ||
          ({
            id: field.dataType,
            name: formatDataTypeLabel(field.dataType),
            value: field.dataType,
          } as Option)
        }
        onChange={(selected) => {
          if (!selected) return
          onUpdate(field.id, {
            dataType: String(selected.value || selected.name),
          })
        }}
      />

      <div className='flex justify-center'>
        <InputCheckbox
          checked={isFolder}
          onChange={(checked) => onToggleFolder(field.id, Boolean(checked))}
        />
      </div>

      <div className='flex justify-center'>
        <InputCheckbox
          checked={isFolder || field.isMandatory}
          disabled={isFolder}
          onChange={(checked) =>
            onUpdate(field.id, { isMandatory: Boolean(checked) })
          }
        />
      </div>

      <div className='flex justify-end'>
        <IconButton
          ariaLabel={`Delete ${field.fieldName}`}
          color='gray'
          icon='lucide:trash-2'
          size='sm'
          variant='ghost'
          onClick={() => onDelete(field.id)}
        />
      </div>
    </div>
  )
}

const ConfigureFieldsStep = () => {
  const fields = useDmsSetupStore((state) => state.fields)
  const setFields = useDmsSetupStore((state) => state.setFields)
  const setStep = useDmsSetupStore((state) => state.setStep)

  const fieldTypeOptions = useMemo(
    () => toFieldTypeOptions([...REPOSITORY_FIELD_DATA_TYPES]) as Option[],
    [],
  )

  const [newFieldName, setNewFieldName] = useState('')
  const [newFieldType, setNewFieldType] = useState(
    String(fieldTypeOptions[0]?.value || 'SHORT_TEXT'),
  )
  const [newIsFolder, setNewIsFolder] = useState(false)
  const [newIsMandatory, setNewIsMandatory] = useState(false)
  const [newFieldIcon, setNewFieldIcon] = useState(
    folderIconOptions.find((option) => option.value === 'folder') || null,
  )

  const displayRows = useMemo(() => buildDisplayRows(fields), [fields])

  const addField = () => {
    const trimmedName = newFieldName.trim()
    if (!trimmedName) return

    setFields(
      recalculateFieldHierarchy([
        ...fields,
        {
          dataType: newFieldType,
          fieldName: trimmedName,
          iconKey: newIsFolder
            ? String(newFieldIcon?.value || 'folder')
            : undefined,
          id: `${trimmedName}-${Date.now()}`,
          includeInFolderStructure: newIsFolder,
          isMandatory: newIsFolder || newIsMandatory,
          level: 0,
          orderId: fields.length + 1,
        },
      ]),
    )
    setNewFieldName('')
    setNewFieldType(String(fieldTypeOptions[0]?.value || 'SHORT_TEXT'))
    setNewIsFolder(false)
    setNewIsMandatory(false)
    setNewFieldIcon(
      folderIconOptions.find((option) => option.value === 'folder') || null,
    )
  }

  const updateField = (id: string, patch: Partial<DmsSetupField>) => {
    const next = fields.map((field) =>
      field.id === id ? { ...field, ...patch } : field,
    )
    setFields(
      'includeInFolderStructure' in patch
        ? recalculateFieldHierarchy(next)
        : next,
    )
  }

  const toggleFolder = (id: string, checked: boolean) => {
    setFields(
      recalculateFieldHierarchy(
        fields.map((field) =>
          field.id === id
            ? {
                ...field,
                iconKey: checked ? field.iconKey || 'folder' : undefined,
                includeInFolderStructure: checked,
                isMandatory: checked ? true : field.isMandatory,
              }
            : field,
        ),
      ),
    )
  }

  const deleteField = (id: string) => {
    setFields(
      recalculateFieldHierarchy(fields.filter((field) => field.id !== id)),
    )
  }

  const handleReorder = (ids: string[]) => {
    const map = new Map(fields.map((field) => [field.id, field]))
    const reordered = ids
      .map((id) => map.get(id))
      .filter((field): field is DmsSetupField => Boolean(field))

    const folderFields = reordered.filter(
      (field) => field.includeInFolderStructure,
    )
    const metadataFields = reordered.filter(
      (field) => !field.includeInFolderStructure,
    )

    setFields(recalculateFieldHierarchy([...folderFields, ...metadataFields]))
  }

  return (
    <StepLayout
      description='Choose the fields each document should have, like vendor name, date, or document type. Mark fields as structure to build your folder hierarchy.'
      title='Configure Fields'
      footer={
        <StepFooter>
          <Button
            color='gray'
            icon='lucide:arrow-left'
            label='Back'
            variant='outline'
            onClick={() => setStep(0)}
          />
          <Button
            label='Continue'
            suffixIcon='lucide:arrow-right'
            onClick={() => setStep(2)}
          />
        </StepFooter>
      }
    >
      <div className='flex flex-col gap-3'>
        <div className='rounded-lg border border-gray-3 bg-surface p-4'>
          <div className='flex flex-col gap-4'>
            <div className='grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_200px] md:items-end'>
              <div>
                <label className='mb-2 block text-13 font-medium text-gray-11'>
                  Field Name
                </label>
                <div className='flex items-center gap-2'>
                  {newIsFolder ? (
                    <InputSelect
                      options={folderIconOptions as Option[]}
                      placeholder='Icon'
                      width='target'
                      value={
                        (folderIconOptions.find(
                          (option) => option.value === newFieldIcon?.value,
                        ) as Option) ||
                        (folderIconOptions[0] as Option) ||
                        null
                      }
                      onChange={(selected) => {
                        if (!selected) return
                        const option = folderIconOptions.find(
                          (item) => item.value === selected.value,
                        )
                        setNewFieldIcon(option || null)
                      }}
                    />
                  ) : null}
                  <div className='min-w-0 flex-1'>
                    <InputText
                      placeholder='e.g. Cost Center'
                      value={newFieldName}
                      onChange={setNewFieldName}
                    />
                  </div>
                </div>
              </div>

              <InputSelect
                label='Type'
                options={fieldTypeOptions}
                placeholder='Field type'
                searchable
                searchPlaceholder='Search type'
                width='target'
                value={
                  fieldTypeOptions.find(
                    (option) => option.value === newFieldType,
                  ) ||
                  fieldTypeOptions[0] ||
                  null
                }
                onChange={(selected) => {
                  if (!selected) return
                  setNewFieldType(String(selected.value || selected.name))
                }}
              />
            </div>

            <div className='flex flex-wrap items-center justify-between gap-3'>
              <div className='flex flex-wrap items-center gap-5'>
                <label className='flex h-9 cursor-pointer items-center gap-2 text-13 font-medium text-gray-12'>
                  <InputCheckbox
                    checked={newIsFolder}
                    onChange={(checked) => {
                      const isFolder = Boolean(checked)
                      setNewIsFolder(isFolder)
                      if (isFolder) setNewIsMandatory(true)
                    }}
                  />
                  Folder
                </label>

                <label className='flex h-9 cursor-pointer items-center gap-2 text-13 font-medium text-gray-12'>
                  <InputCheckbox
                    checked={newIsFolder || newIsMandatory}
                    disabled={newIsFolder}
                    onChange={(checked) => setNewIsMandatory(Boolean(checked))}
                  />
                  Mandatory
                </label>
              </div>

              <Button
                className='h-9'
                icon='lucide:plus'
                label='Add Field'
                onClick={addField}
              />
            </div>
          </div>
        </div>

        {fields.length === 0 ? (
          <div className='rounded-lg border border-dashed border-gray-4 bg-gray-1 px-4 py-8 text-center'>
            <p className='text-14 font-medium text-gray-12'>No fields yet</p>
            <p className='mt-1 text-13 text-gray-10'>
              Add fields above, or go back and generate a setup from a prompt.
            </p>
          </div>
        ) : (
          <div className='overflow-hidden rounded-lg border border-gray-3'>
            <div
              className={cn(
                'grid items-center border-b border-gray-3 bg-gray-1 px-3 py-2 text-12 font-semibold whitespace-nowrap text-gray-11',
                FIELD_TABLE_COLS,
              )}
            >
              <span />
              <span>Field Name</span>
              <span>Type</span>
              <span className='text-center'>Structure</span>
              <span className='text-center'>Mandatory</span>
              <span />
            </div>

            <SortableContainer
              constrainToParent={false}
              items={displayRows.map((field) => field.id)}
              onItemsChange={handleReorder}
            >
              <div className='divide-y divide-gray-3'>
                {displayRows.map((field) => (
                  <SortableFieldRow
                    field={field}
                    fieldTypeOptions={fieldTypeOptions}
                    key={field.id}
                    onDelete={deleteField}
                    onToggleFolder={toggleFolder}
                    onUpdate={updateField}
                  />
                ))}
              </div>
            </SortableContainer>
          </div>
        )}
      </div>
    </StepLayout>
  )
}

ConfigureFieldsStep.displayName = 'ConfigureFieldsStep'
export default ConfigureFieldsStep
