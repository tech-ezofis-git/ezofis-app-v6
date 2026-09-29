import { Icon } from '@iconify/react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import InputDate from '@/components/base/inputs/InputDate'
import InputNumber from '@/components/base/inputs/InputNumber'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputText from '@/components/base/inputs/InputText'
import InputTextarea from '@/components/base/inputs/InputTextarea'
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
  qualifyDecisionStyle,
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

const formatFieldDisplay = (value: string) => {
  if (!isEmptyDisplay(value)) return value
  return 'NA'
}

const isAiInsightEntry = (entry: { label: string; resultKey: string }) => {
  const normalized = (value: string) =>
    value.toLowerCase().replace(/[_\-\s]+/g, '')
  return (
    normalized(entry.label) === 'aiinsight' ||
    normalized(entry.resultKey) === 'aiinsight'
  )
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
  onActivate,
}: HoverEditProps) => {
  const rootRef = useRef<HTMLSpanElement>(null)
  const isActive = canEdit && activeEditId === fieldId

  useEffect(() => {
    if (!isActive) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null
      if (!target) return
      if (rootRef.current?.contains(target)) return
      if (
        target.closest(
          '[data-combobox-dropdown], [data-dates-dropdown], .mantine-Popover-dropdown',
        )
      ) {
        return
      }
      onActivate(null)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onActivate(null)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [isActive, onActivate])

  const wrapLabel = (node: ReactNode) => (
    <span
      className={cn(
        inline ? 'inline-flex max-w-full' : 'flex w-full min-w-0',
        className,
      )}
    >
      {node}
    </span>
  )

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
        isActive
          ? inline
            ? 'inline-flex min-w-0 align-middle'
            : 'block w-full'
          : 'group relative inline-flex max-w-full min-w-0 items-center',
        className,
      )}
      ref={rootRef}
    >
      {isActive ? (
        editor
      ) : (
        <>
          <span className='min-w-0'>{children}</span>
          <button
            aria-label='Edit'
            className='absolute top-1/2 left-full z-10 ml-1 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-gray-8 opacity-0 transition-all group-hover:opacity-100 hover:bg-gray-3 hover:text-gray-12 active:scale-95'
            type='button'
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onActivate(fieldId)
            }}
          >
            <Icon className='size-3.5' icon='lucide:pencil' />
          </button>
        </>
      )}
    </span>,
  )
}

const InlineCaretInput = ({
  value,
  onChange,
}: {
  value: string
  onChange: (next: string) => void
}) => {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const input = inputRef.current
    if (!input) return
    input.focus()
    const end = input.value.length
    input.setSelectionRange(end, end)
  }, [])

  return (
    <input
      className='m-0 max-w-full min-w-[1.5rem] border-0 bg-transparent p-0 text-left text-sm leading-5 font-normal text-gray-12 outline-none [field-sizing:content]'
      ref={inputRef}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
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
  const isPlainText =
    type === 'SHORT_TEXT' ||
    type === 'TEXT' ||
    type === 'NUMBER' ||
    type === 'CURRENCY_AMOUNT' ||
    type === 'COUNTER'
  if (compact && isPlainText) {
    return (
      <InlineCaretInput
        value={value != null ? String(value) : ''}
        onChange={onChange}
      />
    )
  }
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

  const qualifyStatus = qualifyDecisionStyle(viewModel.qualify)

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
      display: formatFieldDisplay(raw),
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
          <span>{display}</span>
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

  const headerEntries = [viewModel.titleEntry, ...viewModel.metaEntries].filter(
    (entry): entry is QualifierScalarEntry =>
      !!entry && !isAiInsightEntry(entry),
  )

  const renderHeaderField = (entry: QualifierScalarEntry) => {
    const resolved = resolveScalarEntry(entry)
    const label = controlLabel(entry.field, entry.label) || entry.label

    return (
      <span
        className='inline-flex max-w-full items-baseline text-left text-sm leading-5 font-normal text-gray-12'
        key={entry.resultKey}
      >
        <span className='font-bold'>{label}: </span>
        <HoverEditShell
          activeEditId={activeEditId}
          canEdit={resolved.canEdit}
          className='max-w-full justify-start text-left'
          fieldId={entry.field ? getFieldId(entry.field) : entry.resultKey}
          inline
          label={label}
          onActivate={setActiveEditId}
          editor={renderScalarEditor(entry, resolved.raw, true)}
        >
          <span>{resolved.display || 'NA'}</span>
        </HoverEditShell>
      </span>
    )
  }

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex items-center justify-between gap-4'>
        <div className='flex min-w-0 flex-1 flex-wrap items-center gap-x-6 gap-y-1 text-left'>
          {headerEntries.map(renderHeaderField)}
        </div>

        <div className='flex shrink-0 flex-col items-end gap-1'>
          {viewModel.qualify ? (
            <div
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm leading-5 font-bold',
                qualifyStatus.className,
              )}
            >
              <Icon className='h-4 w-4' icon={qualifyStatus.icon} />
              {qualifyStatus.label.toUpperCase()}
            </div>
          ) : null}
          {viewModel.confidence != null && viewModel.confidence !== '' ? (
            <div className='flex items-center gap-1 text-xs leading-5 font-semibold text-gray-9'>
              <Icon className='h-3.5 w-3.5' icon='tabler:target' />
              {String(viewModel.confidence)}% {viewModel.confidenceLabel}
            </div>
          ) : null}
        </div>
      </div>

      {viewModel.longTextEntries
        .filter((entry) => !isAiInsightEntry(entry))
        .map((entry) => (
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
