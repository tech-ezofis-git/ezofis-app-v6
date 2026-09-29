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
import QuoteLineItemsTable, {
  buildQuoteTotals,
  normalizeLineItemRows,
  type QuoteTotals,
  toMoney,
} from './QuoteLineItemsTable'
import type { AgentBlock } from './AgentSummaryBoxes'
import {
  getFieldHeading,
  getFieldId,
} from './qualifierResultUtils'
import {
  buildQuoteViewModel,
  getQuoteTaxRate,
  type QuoteScalarEntry,
  type QuoteTableEntry,
  type QuoteTotalEntry,
} from './quoteResultUtils'

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
          : 'group inline-flex max-w-full min-w-0 items-center gap-1',
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
            className='inline-flex size-6 shrink-0 items-center justify-center rounded-md text-gray-8 opacity-0 transition-all group-hover:opacity-100 hover:bg-gray-3 hover:text-gray-12 active:scale-95'
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

const resolveStoredProduct = (
  row: Record<string, any>,
  columns: any[],
) => {
  const productCol = (columns || []).find((col) => {
    const name = String(col?.name || col?.label || '')
      .trim()
      .toLowerCase()
      .replace(/[\s._-]+/g, '')
    return (
      name === 'product' ||
      name === 'sku' ||
      name === 'item' ||
      name === 'itemname' ||
      name === 'productcode'
    )
  })
  if (productCol?.id != null && row?.[productCol.id] != null) {
    return row[productCol.id]
  }
  return row?.Product
}

const QuoteAgentResultView = ({
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
    () => buildQuoteViewModel(result, formFields, tableFields),
    [formFields, result, tableFields],
  )

  const freight =
    viewModel.totals.find((entry) => entry.kind === 'freight')?.value ?? 0
  const taxRate = useMemo(() => getQuoteTaxRate(result), [result])

  const lineItems = useMemo(() => {
    const table = viewModel.lineItemTable
    if (!table) return []
    const field = table.field
    const columns = field?.settings?.specific?.tableColumns || []
    const rawAgentRows = Array.isArray(table.rows) ? table.rows : []
    const agentRows = normalizeLineItemRows(rawAgentRows, columns)

    const pickAgentRow = (row: Record<string, any>, index: number) => {
      const product = String(
        row?.Product ?? resolveStoredProduct(row, columns) ?? '',
      ).trim()
      if (product) {
        const byProduct = agentRows.find(
          (agent) => String(agent.Product || '').trim() === product,
        )
        if (byProduct) return byProduct
        const byRaw = rawAgentRows.find(
          (agent) => String(agent?.Product || '').trim() === product,
        )
        if (byRaw) {
          return normalizeLineItemRows([byRaw], columns)[0] || {}
        }
      }
      return agentRows[index] || {}
    }

    if (field) {
      const id = getFieldId(field)
      const stored = formModel?.[id]
      if (Array.isArray(stored) && stored.length > 0) {
        // Keep agent warning/Note fields if form rows dropped them.
        const merged = stored.map((row: Record<string, any>, index: number) => {
          const agent = pickAgentRow(row, index)
          const note =
            (typeof row.Note === 'string' && row.Note.trim()) ||
            (typeof agent.Note === 'string' && agent.Note.trim()) ||
            ''
          const descriptionColumn = columns.find((col: any) =>
            /description|desc|details/i.test(
              String(col?.name || col?.label || '').trim(),
            ),
          )
          const rawFormDescription = String(
            row.Description ??
              (descriptionColumn?.id != null ? row[descriptionColumn.id] : '') ??
              '',
          ).trim()
          const agentDescription = String(
            agent.Description ?? agent.description ?? '',
          ).trim()
          const formDescriptionIsQty =
            /^\d+(\.\d+)?$/.test(rawFormDescription) &&
            (agent.Qty == null ||
              Number(rawFormDescription) === Number(agent.Qty) ||
              Number(rawFormDescription) === Number(agent.Quantity))
          const description =
            agentDescription &&
            (!rawFormDescription ||
              formDescriptionIsQty ||
              /^\d+(\.\d+)?$/.test(rawFormDescription))
              ? agentDescription
              : rawFormDescription || agentDescription

          const agentQty =
            agent.Qty ?? agent.Quantity ?? agent.qty ?? agent.quantity
          const formQty = row.Qty ?? row.Quantity ?? row.qty ?? row.quantity
          const asNumber = (value: unknown) => {
            const num = Number(value)
            return Number.isFinite(num) ? num : null
          }
          const formQtyNum = asNumber(formQty)
          const formQtyIsMoney =
            formQtyNum != null &&
            (formQtyNum === asNumber(agent.Price) ||
              formQtyNum === asNumber(agent.Subtotal) ||
              formQtyNum === asNumber(row.Price) ||
              formQtyNum === asNumber(row.Subtotal))
          const formQtyUnusable =
            formQty == null ||
            String(formQty).trim() === '' ||
            formQtyIsMoney ||
            (typeof formQty === 'string' &&
              !/^\d+(\.\d+)?$/.test(formQty.trim()))
          const qty =
            agentQty != null &&
            String(agentQty).trim() !== '' &&
            formQtyUnusable
              ? agentQty
              : formQty ?? agentQty

          return {
            ...row,
            Note: note,
            Description: description,
            Qty: qty,
            'Needs Engineering Review':
              row['Needs Engineering Review'] ??
              agent['Needs Engineering Review'] ??
              false,
            Category: row.Category || agent.Category || '',
            _approved: row._approved ?? agent._approved,
            _hideNote: row._hideNote ?? agent._hideNote,
          }
        })
        return normalizeLineItemRows(merged, columns)
      }
    }
    return agentRows
  }, [formModel, viewModel.lineItemTable])

  const initialTotals = useMemo(
    () => buildQuoteTotals(lineItems, freight, taxRate),
    [freight, lineItems, taxRate],
  )

  const [computedTotals, setComputedTotals] =
    useState<QuoteTotals>(initialTotals)
  const [draftTables, setDraftTables] = useState<
    Record<string, Record<string, any>[]>
  >({})
  const [activeEditId, setActiveEditId] = useState<string | null>(null)

  useEffect(() => {
    setComputedTotals(initialTotals)
  }, [initialTotals])

  const blockSettings = agentBlock?.settings || {}
  const editAccess = formAccessMode(blockSettings.formEditAccess)
  const visibilityAccess = formAccessMode(blockSettings.formVisibilityAccess)
  const currentUserId = String(authUserStore.getState().session?.id || '')

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

  const persistTotals = (totals: QuoteTotals) => {
    if (!onFieldChange) return
    viewModel.totals.forEach((entry) => {
      let value: number | null = null
      if (entry.kind === 'subtotal') value = totals.subtotal
      if (entry.kind === 'freight') value = totals.freight
      if (entry.kind === 'tax') value = totals.hst
      if (entry.kind === 'total') value = totals.total
      if (value == null) return
      const current = resolveDisplayValue(entry.field, entry.value, entry.resultKey)
      if (Number(current) === value) return
      writeField(entry.field, value, entry.resultKey)
    })
  }

  const resolveScalarEntry = (entry: QuoteScalarEntry) => {
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
    entry: QuoteScalarEntry,
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
    entry: QuoteScalarEntry,
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

  const resolveTableRows = (table: QuoteTableEntry) => {
    const field = ensureOnDemandTable(table.field)
    const id = getFieldId(field)
    if (draftTables[id]) return draftTables[id]
    return resolveTableValue(formModel, field, table.rows)
  }

  const totalDisplayValue = (entry: QuoteTotalEntry) => {
    if (entry.kind === 'subtotal') return computedTotals.subtotal
    if (entry.kind === 'freight') return computedTotals.freight
    if (entry.kind === 'tax') return computedTotals.hst
    if (entry.kind === 'total') return computedTotals.total
    return entry.value
  }

  const grandTotalLabel =
    viewModel.grandTotal?.label ||
    viewModel.totals.find((entry) => entry.kind === 'total')?.label ||
    'Total'

  const breakdownTotals = viewModel.totals.filter(
    (entry) => entry.kind !== 'total',
  )

  const headerEntries = [viewModel.titleEntry, ...viewModel.metaEntries].filter(
    (entry): entry is QuoteScalarEntry => !!entry,
  )

  const renderHeaderField = (entry: QuoteScalarEntry) => {
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

        <div className='shrink-0 text-left text-sm leading-5 font-normal text-gray-12'>
          <span className='font-bold'>{grandTotalLabel}: </span>
          ${toMoney(computedTotals.total)}
        </div>
      </div>

      {viewModel.lineItemTable &&
        (lineItems.length > 0 || !readOnly) && (
          <QuoteLineItemsTable
            freight={freight}
            items={lineItems}
            readOnly={readOnly}
            taxRate={taxRate}
            title={viewModel.lineItemTable.label}
            workflow={workflow}
            onFieldChange={onFieldChange}
            onTotalsChange={(totals) => {
              setComputedTotals((prev) =>
                prev.subtotal === totals.subtotal &&
                prev.freight === totals.freight &&
                prev.hst === totals.hst &&
                prev.total === totals.total
                  ? prev
                  : totals,
              )
              persistTotals(totals)
            }}
          />
        )}

      {breakdownTotals.length > 0 && (
        <div className='flex justify-end border-t border-gray-3 pt-4'>
          <div className='flex w-full max-w-sm flex-col gap-2 text-sm'>
            {breakdownTotals.map((entry) => (
              <div
                className='flex justify-between text-gray-11'
                key={entry.resultKey}
              >
                <span>{entry.label}</span>
                <span className='font-medium text-gray-12'>
                  ${toMoney(totalDisplayValue(entry))}
                </span>
              </div>
            ))}
            {viewModel.grandTotal ? (
              <div className='mt-2 flex justify-between border-t border-gray-2 pt-2 text-base font-bold text-gray-12'>
                <span>{viewModel.grandTotal.label}</span>
                <span className='text-[var(--primary-11)]'>
                  ${toMoney(computedTotals.total)}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {viewModel.longTextEntries.map((entry) => (
        <div className='flex flex-col gap-2' key={entry.resultKey}>
          <h4 className='text-sm font-semibold text-gray-12'>{entry.label}</h4>
          {renderScalarHover(entry)}
        </div>
      ))}

      {viewModel.listEntries.map((entry) => {
        const items = Array.isArray(entry.value)
          ? entry.value.map(String)
          : String(entry.value || '')
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
        if (!items.length) return null

        return (
          <div className='flex flex-col gap-2 border-t border-gray-3 pt-2' key={entry.resultKey}>
            <h4 className='flex items-center gap-1.5 text-sm font-semibold text-gray-12'>
              <Icon className='h-4 w-4 text-orange-9' icon='tabler:bulb' />
              {entry.label}
            </h4>
            <ul className='flex list-disc flex-col gap-1 pl-5'>
              {items.map((note: string, i: number) => (
                <li className='text-xs text-gray-10' key={`${note}-${i}`}>
                  {note}
                </li>
              ))}
            </ul>
          </div>
        )
      })}

      {viewModel.otherTables.map((table) => {
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

export default QuoteAgentResultView
