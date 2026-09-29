import { Icon } from '@iconify/react'
import { useMemo, useState, type ReactNode } from 'react'
import InputDate from '@/components/base/inputs/InputDate'
import InputNumber from '@/components/base/inputs/InputNumber'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputText from '@/components/base/inputs/InputText'
import InputTextarea from '@/components/base/inputs/InputTextarea'
import Tooltip from '@/components/base/Tooltip'
import { mapExternalRowsToTableColumns } from '@/pages/requests/components/workflow-request/components/TableFieldRenderer'
import {
  getConfiguredFieldOptions,
  getFieldOptions,
  isFieldHidden,
  isFieldReadOnly,
} from '@/pages/requests/components/workflow-request/utils/fieldRendering'
import authUserStore from '@/stores/authUserStore'
import cn from '@/utils/cn'
import AgentFlatTable, {
  normalizeAgentTableRows,
} from './AgentFlatTable'
import {
  collectFormFields,
  collectFormTableFields,
} from './AgentEditableTables'
import type { AgentBlock } from './AgentSummaryBoxes'
import {
  buildQualifierViewModel,
  getFieldHeading,
  getFieldId,
  type QualifierScalarEntry,
  type QualifierTableEntry,
} from './qualifierResultUtils'

export { getQualifierValue } from './qualifierResultUtils'

const ensureOnDemandTable = (field: any) => {
  if (!field) return field
  return {
    ...field,
    settings: {
      ...(field.settings || {}),
      specific: {
        ...(field.settings?.specific || {}),
        rowsType: 'ON_DEMAND',
      },
    },
  }
}

const resolveTableValue = (
  formModel: Record<string, any>,
  field: any | null,
  agentRows: Record<string, any>[],
) => {
  if (field) {
    const id = getFieldId(field)
    const stored = formModel?.[id]
    if (Array.isArray(stored) && stored.length > 0) return stored
    const columns = field?.settings?.specific?.tableColumns || []
    if (columns.length > 0 && agentRows.length > 0) {
      return mapExternalRowsToTableColumns(agentRows, columns)
    }
  }
  return agentRows
}

const formAccessMode = (value: unknown): 'ALL' | 'NONE' | 'CUSTOM' => {
  const access = String(value ?? 'ALL').toUpperCase()
  if (access === 'NONE') return 'NONE'
  if (access === 'CUSTOM') return 'CUSTOM'
  return 'ALL'
}

const controlLabel = (field: any | null, fallback?: string) =>
  field ? getFieldHeading(field) : fallback

const isEmptyDisplay = (value: string) => {
  const trimmed = value.trim()
  return (
    !trimmed ||
    trimmed === '—' ||
    trimmed.toLowerCase() === 'unknown' ||
    trimmed.toLowerCase() === 'unknown project'
  )
}

const formatFieldDisplay = (
  value: string,
  field: any | null,
  canEdit: boolean,
  fallbackLabel?: string,
) => {
  if (!isEmptyDisplay(value)) return value
  if (canEdit) {
    const label = controlLabel(field, fallbackLabel) || 'field'
    return `Kindly Enter ${label}`
  }
  return ''
}

const stringifyScalar = (value: unknown) => {
  if (value === null || value === undefined) return ''
  if (Array.isArray(value)) return value.map(String).join(', ')
  if (typeof value === 'object') return ''
  return String(value)
}

interface HoverEditProps {
  activeEditId: string | null
  canEdit: boolean
  children: ReactNode
  className?: string
  editor: ReactNode
  fieldId: string
  inline?: boolean
  label?: string
  onActivate: (id: string | null) => void
}

const HoverEditShell = ({
  activeEditId,
  canEdit,
  children,
  className,
  editor,
  fieldId,
  inline = false,
  label,
  onActivate,
}: HoverEditProps) => {
  const isActive = canEdit && activeEditId === fieldId

  const wrapLabel = (node: ReactNode) => {
    if (!label) return node
    return (
      <Tooltip
        className={cn(
          inline ? 'inline-flex max-w-full' : 'flex w-full min-w-0',
          className,
        )}
        content={label}
        openDelay={200}
        position='top'
      >
        {node}
      </Tooltip>
    )
  }

  if (!canEdit) {
    return wrapLabel(
      <span className={cn(inline ? 'inline' : 'block', className)}>
        {children}
      </span>,
    )
  }

  return wrapLabel(
    <span
      className={cn(
        'rounded px-0.5 transition-colors',
        inline ? 'inline-flex min-w-0 align-middle' : 'block w-full',
        !isActive && 'cursor-text hover:bg-gray-2 hover:text-gray-12',
        className,
      )}
      onMouseEnter={() => onActivate(fieldId)}
      onMouseLeave={() => onActivate(null)}
    >
      {isActive ? editor : children}
    </span>,
  )
}

const ScalarEditor = ({
  compact = false,
  field,
  value,
  onChange,
}: {
  compact?: boolean
  field: any
  value: any
  onChange: (next: any) => void
}) => {
  const type = String(field?.type || 'SHORT_TEXT').toUpperCase()
  const inputClass = compact ? 'min-w-[10rem] text-sm' : 'w-full'
  if (type === 'DATE') {
    return (
      <InputDate
        className={inputClass}
        value={value != null && value !== '' ? String(value) : null}
        onChange={(v) => onChange(v || '')}
      />
    )
  }
  if (type === 'NUMBER' || type === 'CURRENCY_AMOUNT' || type === 'COUNTER') {
    return (
      <InputNumber
        className={inputClass}
        value={value != null ? value : ''}
        onChange={(v) => onChange(v)}
      />
    )
  }
  if (
    type === 'SINGLE_SELECT' ||
    type === 'DROPDOWN' ||
    type === 'SINGLE_CHOICE'
  ) {
    const options =
      getConfiguredFieldOptions(field).length > 0
        ? getConfiguredFieldOptions(field)
        : getFieldOptions(field)
    const selected =
      value != null && value !== ''
        ? options.find((o) => String(o.id) === String(value)) || {
            id: String(value),
            name: String(value),
          }
        : null
    return (
      <InputSelect
        className={inputClass}
        options={options}
        searchable
        value={selected}
        onChange={(opt) => onChange(opt ? String(opt.id) : '')}
      />
    )
  }
  if (type === 'LONG_TEXT') {
    return (
      <InputTextarea
        autosize
        className={inputClass}
        maxRows={compact ? 4 : 8}
        minRows={compact ? 1 : 2}
        value={value != null ? String(value) : ''}
        onChange={(v) => onChange(v)}
      />
    )
  }
  return (
    <InputText
      autoFocus
      className={inputClass}
      value={value != null ? String(value) : ''}
      onChange={(v) => onChange(v)}
    />
  )
}

interface Props {
  agentBlock?: AgentBlock | null
  formModel?: Record<string, any>
  readOnly?: boolean
  result: Record<string, any>
  workflow?: any
  onFieldChange?: (fieldId: string, value: any) => void
}

const QualifyAgentResultView = ({
  agentBlock,
  formModel = {},
  readOnly = false,
  result,
  workflow,
  onFieldChange,
}: Props) => {
  const formFields = useMemo(() => collectFormFields(workflow), [workflow])
  const tableFields = useMemo(
    () => collectFormTableFields(workflow),
    [workflow],
  )

  const viewModel = useMemo(
    () => buildQualifierViewModel(result, formFields, tableFields),
    [formFields, result, tableFields],
  )

  const blockSettings = agentBlock?.settings || {}
  const editAccess = formAccessMode(blockSettings.formEditAccess)
  const visibilityAccess = formAccessMode(blockSettings.formVisibilityAccess)
  const currentUserId = String(authUserStore.getState().session?.id || '')

  const [draftTables, setDraftTables] = useState<
    Record<string, Record<string, any>[]>
  >({})
  const [activeEditId, setActiveEditId] = useState<string | null>(null)

  const isQualifyDecision = viewModel.qualify.toLowerCase() === 'qualify'

  const canEditField = (field: any | null) => {
    if (readOnly || !onFieldChange || !field) return false
    if (isFieldHidden(field) || isFieldReadOnly(field)) return false
    const id = getFieldId(field)
    if (visibilityAccess === 'NONE') return false
    if (visibilityAccess === 'CUSTOM') {
      const rules = Array.isArray(blockSettings.formSecureControls)
        ? blockSettings.formSecureControls
        : []
      const rule = rules.find((r: any) => String(r.userId) === currentUserId)
      if (rule) {
        const visible = new Set((rule.formFields || []).map(String))
        if (!visible.has(id)) return false
      }
    }
    if (editAccess === 'NONE') return false
    if (editAccess === 'CUSTOM') {
      const rules = Array.isArray(blockSettings.formEditControls)
        ? blockSettings.formEditControls
        : []
      const rule = rules.find((r: any) => String(r.userId) === currentUserId)
      if (!rule) return true
      const editable = new Set((rule.formFields || []).map(String))
      if (!editable.has(id)) return false
    }
    return true
  }

  const resolveDisplayValue = (
    field: any | null,
    fallback: unknown,
    resultKey?: string,
  ) => {
    if (field) {
      const id = getFieldId(field)
      const fromForm = formModel?.[id]
      if (fromForm !== undefined && fromForm !== null && fromForm !== '') {
        return fromForm
      }
    }
    if (
      resultKey &&
      formModel?.[resultKey] !== undefined &&
      formModel?.[resultKey] !== null &&
      formModel?.[resultKey] !== ''
    ) {
      return formModel[resultKey]
    }
    return fallback
  }

  const writeField = (field: any | null, value: any, resultKey?: string) => {
    if (!onFieldChange) return
    if (field) {
      onFieldChange(getFieldId(field), value)
      return
    }
    if (resultKey) onFieldChange(resultKey, value)
  }

  const writeTable = (field: any | null, rows: Record<string, any>[]) => {
    if (!field) return
    const id = getFieldId(field)
    setDraftTables((prev) => ({ ...prev, [id]: rows }))
    onFieldChange?.(id, rows)
  }

  const resolveScalarEntry = (entry: QualifierScalarEntry) => {
    const raw = stringifyScalar(
      resolveDisplayValue(entry.field, entry.value, entry.resultKey),
    )
    const canEdit = entry.field ? canEditField(entry.field) : false
    return {
      canEdit,
      display: formatFieldDisplay(raw, entry.field, canEdit, entry.label),
      raw,
    }
  }

  const renderScalarEditor = (
    entry: QualifierScalarEntry,
    raw: string,
    compact = false,
  ) => {
    const field = entry.field || {
      id: entry.resultKey,
      label: entry.label,
      type: entry.isLongText ? 'LONG_TEXT' : 'SHORT_TEXT',
    }

    if (entry.isStringList) {
      return (
        <ScalarEditor
          compact={compact}
          field={field}
          value={Array.isArray(entry.value) ? entry.value.join(', ') : raw}
          onChange={(v) =>
            writeField(
              entry.field,
              String(v)
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
              entry.resultKey,
            )
          }
        />
      )
    }

    return (
      <ScalarEditor
        compact={compact}
        field={field}
        value={isEmptyDisplay(raw) ? '' : raw}
        onChange={(v) => writeField(entry.field, v, entry.resultKey)}
      />
    )
  }

  const renderScalarHover = (
    entry: QualifierScalarEntry,
    options?: { compact?: boolean; inline?: boolean; className?: string },
  ) => {
    const { canEdit, display, raw } = resolveScalarEntry(entry)
    const fieldId = entry.field
      ? getFieldId(entry.field)
      : entry.resultKey

    return (
      <HoverEditShell
        activeEditId={activeEditId}
        canEdit={canEdit}
        className={options?.className}
        fieldId={fieldId}
        inline={options?.inline}
        label={controlLabel(entry.field, entry.label)}
        onActivate={setActiveEditId}
        editor={renderScalarEditor(entry, raw, options?.compact)}
      >
        {options?.compact ? (
          <span
            className={cn(
              isEmptyDisplay(raw) && canEdit && 'italic text-gray-8',
            )}
          >
            {display}
          </span>
        ) : (
          <span className='leading-relaxed'>{display || raw}</span>
        )}
      </HoverEditShell>
    )
  }

  const resolveTableRows = (table: QualifierTableEntry) => {
    const field = ensureOnDemandTable(table.field)
    const id = getFieldId(field)
    if (draftTables[id]) return draftTables[id]
    return resolveTableValue(formModel, field, table.rows)
  }

  const titleEntry = viewModel.titleEntry
  const titleResolved = titleEntry ? resolveScalarEntry(titleEntry) : null

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div className='min-w-0 flex-1'>
          {titleEntry ? (
            titleEntry.isLongText ? (
              renderScalarHover(titleEntry)
            ) : (
              <HoverEditShell
                activeEditId={activeEditId}
                canEdit={titleResolved?.canEdit ?? false}
                fieldId={
                  titleEntry.field
                    ? getFieldId(titleEntry.field)
                    : titleEntry.resultKey
                }
                label={controlLabel(titleEntry.field, titleEntry.label)}
                onActivate={setActiveEditId}
                editor={renderScalarEditor(
                  titleEntry,
                  titleResolved?.raw || '',
                  true,
                )}
              >
                <h3
                  className={cn(
                    'text-lg font-bold text-gray-12',
                    titleResolved &&
                      isEmptyDisplay(titleResolved.raw) &&
                      titleResolved.canEdit &&
                      'text-base font-medium italic text-gray-8',
                  )}
                >
                  {titleResolved?.display || titleResolved?.raw}
                </h3>
              </HoverEditShell>
            )
          ) : null}

          {viewModel.metaEntries.length > 0 && (
            <div className='mt-1 flex flex-wrap items-center gap-x-2 gap-y-0 text-sm text-gray-9'>
              {viewModel.metaEntries.map((entry, index) => (
                <span
                  className='inline-flex items-center gap-2'
                  key={entry.resultKey}
                >
                  {index > 0 ? (
                    <span aria-hidden className='text-gray-7'>
                      •
                    </span>
                  ) : null}
                  {renderScalarHover(entry, { compact: true, inline: true })}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className='flex flex-col items-end gap-2'>
          {viewModel.qualify ? (
            <div
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-bold',
                isQualifyDecision
                  ? 'border-green-4 bg-green-2 text-green-11'
                  : 'border-red-4 bg-red-2 text-red-11',
              )}
            >
              {isQualifyDecision ? (
                <Icon className='h-4 w-4' icon='tabler:check' />
              ) : (
                <Icon className='h-4 w-4' icon='tabler:x' />
              )}
              {viewModel.qualify.toUpperCase()}
            </div>
          ) : null}
          {viewModel.confidence != null && viewModel.confidence !== '' && (
            <div className='flex items-center gap-1 text-xs font-semibold text-gray-9'>
              <Icon className='h-3.5 w-3.5' icon='tabler:target' />
              {String(viewModel.confidence)}% {viewModel.confidenceLabel}
            </div>
          )}
        </div>
      </div>

      {viewModel.longTextEntries.map((entry) => (
        <div
          className='flex items-start gap-3 rounded-lg border border-primary-3 bg-primary-1 p-4 text-primary-11'
          key={entry.resultKey}
        >
          <Icon
            className='mt-0.5 h-5 w-5 shrink-0 text-primary-9'
            icon='tabler:sparkles'
          />
          <div className='flex min-w-0 flex-1 flex-col gap-1 text-sm'>
            <span className='font-bold text-primary-12'>{entry.label}</span>
            {renderScalarHover(entry)}
          </div>
        </div>
      ))}

      {viewModel.flagEntries.map((entry) => {
        const flags = Array.isArray(entry.value)
          ? entry.value.map(String)
          : String(entry.value || '')
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
        if (!flags.length) return null

        return (
          <div className='flex flex-col gap-2' key={entry.resultKey}>
            <h4 className='text-sm font-semibold text-gray-12'>{entry.label}</h4>
            <HoverEditShell
              activeEditId={activeEditId}
              canEdit={entry.field ? canEditField(entry.field) : false}
              fieldId={
                entry.field ? getFieldId(entry.field) : entry.resultKey
              }
              label={controlLabel(entry.field, entry.label)}
              onActivate={setActiveEditId}
              editor={renderScalarEditor(
                entry,
                flags.join(', '),
              )}
            >
              <div className='flex flex-wrap gap-2'>
                {flags.map((flag: string, i: number) => (
                  <span
                    className='inline-flex items-center gap-1 rounded-md border border-orange-3 bg-orange-2 px-2 py-1 text-xs font-semibold text-orange-10'
                    key={`${flag}-${i}`}
                  >
                    <Icon className='h-3 w-3' icon='tabler:flag' />
                    {flag}
                  </span>
                ))}
              </div>
            </HoverEditShell>
          </div>
        )
      })}

      {viewModel.tables.map((table) => {
        const field = ensureOnDemandTable(table.field)
        const rows = resolveTableRows(table)
        const editable =
          !readOnly &&
          Boolean(onFieldChange) &&
          (table.field ? canEditField(table.field) : true)

        if (!rows.length && !editable) return null

        return (
          <AgentFlatTable
            columns={field.settings?.specific?.tableColumns || []}
            icon='tabler:table'
            key={table.resultKey}
            readOnly={!editable}
            rows={normalizeAgentTableRows(
              rows,
              field.settings?.specific?.tableColumns || [],
            )}
            title={table.label}
            onChange={(nextRows) => writeTable(field, nextRows)}
          />
        )
      })}
    </div>
  )
}

export default QualifyAgentResultView
