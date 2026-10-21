import { Icon } from '@iconify/react'
import { useLingui } from '@lingui/react/macro'
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { pdfBase64ToObjectUrl, previewDocument } from '@/api/v6/documentPreview'
import Button from '@/components/base/button/Button'
import DocumentPreviewViewer from '@/components/common/document-preview/DocumentPreviewViewer'
import InputDate from '@/components/base/inputs/InputDate'
import InputNumber from '@/components/base/inputs/InputNumber'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputText from '@/components/base/inputs/InputText'
import InputTextarea from '@/components/base/inputs/InputTextarea'
import showToast from '@/components/base/toast/showToast'
import { mapExternalRowsToTableColumns } from '@/pages/requests/components/workflow-request/components/TableFieldRenderer'
import {
  getConfiguredFieldOptions,
  getFieldOptions,
} from '@/pages/requests/components/workflow-request/utils/fieldRendering'
import cn from '@/utils/cn'
import type { AgentBlock } from './AgentSummaryBoxes'
import {
  canEditAgentFormField,
  canViewAgentFormField,
} from './agentFormFieldAccess'
import {
  collectFormFields,
  collectFormTableFields,
} from './AgentEditableTables'
import AgentFlatTable, { normalizeAgentTableRows } from './AgentFlatTable'
import {
  buildDocumentPreviewFormData,
  getDocumentGenerateTemplateJson,
  getWorkflowFormId,
} from './documentGenerateTemplate'
import { getFieldHeading, getFieldId } from './qualifierResultUtils'
import TruncatedExpandText from './TruncatedExpandText'
import QuoteLineItemsTable, {
  buildQuoteTotals,
  normalizeLineItemRows,
  remapLineItemRows,
  toFormTableRows,
  type QuoteTotals,
  toMoney,
} from './QuoteLineItemsTable'
import QuoteVariantCards, {
  QuoteComparePanel,
  QuoteVariantEmptyPanel,
  type QuoteTabId,
} from './QuoteVariantCards'
import {
  buildQuoteViewModel,
  displayQuoteTotalLabel,
  getQuoteTaxRate,
  type QuoteScalarEntry,
  type QuoteTableEntry,
  type QuoteTotalEntry,
} from './quoteResultUtils'
import {
  collectQuoteVariantResultKeys,
  extractQuoteVariants,
  isQuoteVariantTableKey,
  QUOTE_VARIANT_META,
  resolveLineItemTableVariant,
  resolveQuoteFieldVariant,
  resolveRowQuoteVariant,
  stripQuoteVariantLabel,
  resolveVariantScalarFromResult,
  effectiveDynamicColumns,
  extractQuoteVariantEmptyMeta,
  previewQuoteTypeForVariant,
  resolveComparePayload,
  VARIANT_REMARKS_KEYS,
  VARIANT_SCALAR_KEYS,
  type QuoteVariantId,
  type QuoteVariantTableSource,
} from './quoteVariants'

type QuotePaneMode = 'agent_review' | 'preview'

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

const controlLabel = (field: any | null, fallback?: string) =>
  stripQuoteVariantLabel(field ? getFieldHeading(field) : fallback || '')

const dynamicCellFilled = (value: unknown) => {
  if (value == null || value === '') return false
  if (typeof value === 'object') return false
  const text = String(value).trim()
  return text !== '' && text.toUpperCase() !== 'NA'
}

const compactControl = (value: string) =>
  value.toLowerCase().replace(/[\s._-]+/g, '')

const lineValueSignature = (rows: Record<string, any>[] | undefined) =>
  JSON.stringify(
    (Array.isArray(rows) ? rows : []).map((row) => [
      String(row?.Product ?? '').trim(),
      String(row?.Description ?? '').trim(),
      String(row?.Qty ?? ''),
      String(row?.Price ?? ''),
      String(row?.Discount ?? ''),
    ]),
  )

const sameStoredNumber = (stored: unknown, next: number) => {
  if (stored == null || stored === '') return false
  const current = Number(String(stored).replace(/[$,%\s]/g, ''))
  return Number.isFinite(current) && Math.abs(current - next) < 0.02
}

/** When rows carry their own keys, hide unused builder columns such as "Traceability". */
const columnsForFilledDynamicTable = (
  schema: { id: string; label?: string; name?: string; type?: string; settings?: any }[],
  rows: Record<string, any>[],
) => {
  const filledRows = rows.filter((row) =>
    Object.entries(row || {}).some(
      ([key, value]) => !key.startsWith('_') && dynamicCellFilled(value),
    ),
  )
  if (!filledRows.length) return schema

  const usedSchema = schema.filter((col) =>
    filledRows.some(
      (row) =>
        dynamicCellFilled(row[col.id]) ||
        dynamicCellFilled(row[col.name || '']) ||
        dynamicCellFilled(row[col.label || '']),
    ),
  )
  const known = new Set(
    usedSchema.flatMap((col) => [col.id, String(col.name || ''), String(col.label || '')]),
  )
  const extras: { id: string; name: string; type: string }[] = []
  filledRows.forEach((row) => {
    Object.keys(row || {}).forEach((key) => {
      if (key.startsWith('_') || known.has(key)) return
      if (!filledRows.some((item) => dynamicCellFilled(item[key]))) return
      known.add(key)
      extras.push({ id: key, name: key, type: 'SHORT_TEXT' })
    })
  })
  if (extras.length) return [...usedSchema, ...extras]
  return usedSchema.length ? usedSchema : schema
}

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
  editor: ReactNode
  fieldId: string
  className?: string
  /** When set, pencil sits top-right on the same row as this heading. */
  heading?: ReactNode
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
  heading,
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

  const editButton = (
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
  )

  const wrapLabel = (node: ReactNode) => (
    <span
      className={cn(
        inline
          ? 'inline-flex max-w-full min-w-0 items-baseline align-baseline'
          : 'flex w-full min-w-0 items-baseline',
        className,
      )}
    >
      {node}
    </span>
  )

  if (!canEdit) {
    if (heading) {
      return wrapLabel(
        <span className='flex w-full min-w-0 flex-col gap-1'>
          <span className='flex min-w-0 items-center justify-between gap-2'>
            {heading}
          </span>
          <span className='block min-w-0'>{children}</span>
        </span>,
      )
    }
    return wrapLabel(
      <span
        className={cn(
          'min-w-0 overflow-hidden',
          inline ? 'inline align-baseline' : 'block w-full',
        )}
      >
        {children}
      </span>,
    )
  }

  if (heading) {
    return wrapLabel(
      <span
        ref={rootRef}
        className='group flex w-full min-w-0 flex-col gap-1 rounded px-0.5 transition-colors'
      >
        <span className='flex min-w-0 items-center justify-between gap-2'>
          {heading}
          {!isActive ? editButton : <span className='size-6 shrink-0' />}
        </span>
        {isActive ? (
          editor
        ) : (
          <span className='block min-w-0 w-full'>{children}</span>
        )}
      </span>,
    )
  }

  return wrapLabel(
    <span
      ref={rootRef}
      className={cn(
        'group relative min-w-0 rounded px-0.5 transition-colors',
        isActive
          ? inline
            ? 'inline-flex items-baseline align-baseline'
            : 'block w-full'
          : inline
            ? 'inline-flex max-w-full items-baseline pr-5 align-baseline'
            : 'flex w-full items-baseline pr-5',
      )}
    >
      {isActive ? (
        editor
      ) : (
        <>
          <span className='min-w-0 flex-1 overflow-hidden align-baseline'>
            {children}
          </span>
          <button
            aria-label='Edit'
            className='absolute top-1/2 right-0 inline-flex size-5 shrink-0 -translate-y-1/2 items-center justify-center rounded-md text-gray-8 opacity-0 transition-all group-hover:opacity-100 hover:bg-gray-3 hover:text-gray-12 active:scale-95'
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
      className='m-0 [field-sizing:content] max-w-full min-w-[1.5rem] border-0 bg-transparent p-0 text-left text-sm leading-5 font-normal text-gray-12 outline-none'
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
        value={selected}
        searchable
        onChange={(opt) => onChange(opt ? String(opt.id) : '')}
      />
    )
  }
  if (type === 'LONG_TEXT') {
    return (
      <InputTextarea
        className={inputClass}
        maxRows={compact ? 4 : 8}
        minRows={compact ? 1 : 2}
        value={value != null ? String(value) : ''}
        autosize
        onChange={(v) => onChange(v)}
      />
    )
  }
  return (
    <InputText
      className={inputClass}
      value={value != null ? String(value) : ''}
      autoFocus
      onChange={(v) => onChange(v)}
    />
  )
}

interface Props {
  result: Record<string, any>
  agentBlock?: AgentBlock | null
  formModel?: Record<string, any>
  /** From current activity block — same Sets as the request form page. */
  hiddenFieldIds?: Set<string>
  readOnly?: boolean
  readOnlyFieldIds?: Set<string>
  requestData?: any
  workflow?: any
  onFieldChange?: (fieldId: string, value: any) => void
  /** Writes every quote tab's displayed values in one save payload. */
  onFieldsChange?: (patch: Record<string, any>) => void
  /** Live grand total for the agent-tab header (before Attachments). */
  onQuoteTotalChange?: (total: number | null) => void
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
    if (columns.length > 0 && (agentRows?.length ?? 0) > 0) {
      return mapExternalRowsToTableColumns(agentRows, columns)
    }
  }
  return agentRows || []
}

const resolveStoredProduct = (row: Record<string, any>, columns: any[]) => {
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
  hiddenFieldIds,
  readOnly = false,
  readOnlyFieldIds,
  result,
  workflow,
  onFieldChange,
  onFieldsChange,
  onQuoteTotalChange,
}: Props) => {
  const { t } = useLingui()
  const formFields = useMemo(() => collectFormFields(workflow), [workflow])
  const tableFields = useMemo(
    () => collectFormTableFields(workflow),
    [workflow],
  )

  const documentTemplateJson = useMemo(
    () => getDocumentGenerateTemplateJson(workflow),
    [workflow],
  )
  const workflowFormId = useMemo(() => getWorkflowFormId(workflow), [workflow])

  const [paneMode, setPaneMode] = useState<QuotePaneMode>('agent_review')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewFileName, setPreviewFileName] = useState('quote.pdf')
  const previewUrlRef = useRef<string | null>(null)
  const [activeQuoteTabId, setActiveQuoteTabId] =
    useState<QuoteTabId>('main')
  const [copiedFromByVariant, setCopiedFromByVariant] = useState<
    Partial<Record<QuoteVariantId, QuoteVariantId>>
  >({})
  /** Copied rows kept locally so Quote 2/3 leave the empty panel even if form keys lag. */
  const [draftRowsByVariant, setDraftRowsByVariant] = useState<
    Partial<Record<QuoteVariantId, Record<string, any>[]>>
  >({})
  const [draftOrderByVariant, setDraftOrderByVariant] = useState<
    Partial<Record<QuoteVariantId, string>>
  >({})

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
        previewUrlRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!documentTemplateJson && paneMode === 'preview') {
      setPaneMode('agent_review')
    }
  }, [documentTemplateJson, paneMode])

  const viewModel = useMemo(
    () => buildQuoteViewModel(result, formFields, tableFields),
    [formFields, result, tableFields],
  )

  const resolveTotalEntryValue = (
    variantId: QuoteVariantId,
    kind: QuoteTotalEntry['kind'],
  ) => {
    const entries = viewModel.totals.filter((entry) => entry.kind === kind)
    const entry =
      entries.find((e) => (e.variant || 'main') === variantId) ||
      (variantId === 'main' ? entries[0] : null)
    if (entry) {
      const fromForm =
        formModel?.[
          entry.field ? getFieldId(entry.field) : entry.resultKey
        ]
      if (fromForm !== undefined && fromForm !== null && fromForm !== '') {
        return Number(fromForm) || 0
      }
      return Number(entry.value || 0) || 0
    }
    if (kind === 'discount' || kind === 'freight' || kind === 'subtotal' || kind === 'tax' || kind === 'total') {
      return (
        resolveVariantScalarFromResult(result, variantId, kind === 'tax' ? 'tax' : kind) ||
        0
      )
    }
    return 0
  }

  const resolveFreightForVariant = (variantId: QuoteVariantId) =>
    resolveTotalEntryValue(variantId, 'freight')

  const resolveDiscountForVariant = (variantId: QuoteVariantId) =>
    resolveTotalEntryValue(variantId, 'discount')

  const freight = resolveFreightForVariant('main')
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
        // Form rows are persisted with column UUIDs only — normalize first so
        // Qty/Price edits win. Then layer agent warning/note metadata.
        const formRows = normalizeLineItemRows(stored, columns)
        return formRows.map((row: Record<string, any>, index: number) => {
          const agent = pickAgentRow(row, index)
          const note =
            (typeof row.Note === 'string' && row.Note.trim()) ||
            (typeof agent.Note === 'string' && agent.Note.trim()) ||
            ''
          const description =
            String(row.Description || '').trim() ||
            String(agent.Description || agent.description || '').trim()

          return {
            ...row,
            '_approved': row._approved ?? agent._approved,
            '_hideNote': row._hideNote ?? agent._hideNote,
            'Category': row.Category || agent.Category || '',
            'Description': description,
            'Needs Engineering Review':
              row['Needs Engineering Review'] ??
              agent['Needs Engineering Review'] ??
              false,
            'Note': note,
          }
        })
      }
    }
    return agentRows
  }, [formModel, viewModel.lineItemTable])

  const lineItemColumns = useMemo(
    () =>
      viewModel.lineItemTable?.field?.settings?.specific?.tableColumns || [],
    [viewModel.lineItemTable],
  )

  const initialTotals = useMemo(
    () =>
      buildQuoteTotals(
        lineItems,
        freight,
        taxRate,
        lineItemColumns,
        resolveDiscountForVariant('main'),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [freight, lineItemColumns, lineItems, taxRate, formModel, viewModel.totals],
  )

  const resultForVariants = useMemo(() => {
    const next: Record<string, any> = { ...(result || {}) }
    viewModel.otherTables.forEach((table) => {
      const key = table.resultKey || table.label
      if (!key) return
      const fieldId = table.field ? getFieldId(table.field) : ''
      const fromForm =
        fieldId && Array.isArray(formModel?.[fieldId])
          ? formModel[fieldId]
          : null
      if (fromForm) next[key] = fromForm
      else if (Array.isArray(table.rows)) next[key] = table.rows
    })
    return next
  }, [formModel, result, viewModel.otherTables])

  const formVariantTables = useMemo((): QuoteVariantTableSource[] => {
    const sources: QuoteVariantTableSource[] = []
    const seen = new Set<QuoteVariantId>()

    const readFormTableRows = (field: any): Record<string, any>[] | null => {
      const keys = [
        field?.id,
        field?.jsonId,
        field?.name,
        getFieldHeading(field),
        getFieldId(field),
      ]
        .filter(Boolean)
        .map((key) => String(key))
      for (const key of keys) {
        const value = formModel?.[key]
        if (Array.isArray(value) && value.length > 0) return value
      }
      // Distinguish "missing" from explicit empty array after clear.
      for (const key of keys) {
        if (Array.isArray(formModel?.[key])) return formModel[key]
      }
      return null
    }

    tableFields.forEach((field) => {
      const heading = getFieldHeading(field)
      const id = resolveLineItemTableVariant(heading)
      if (!id) return
      seen.add(id)
      const fieldId = getFieldId(field)
      const columns = field?.settings?.specific?.tableColumns || []
      const fromForm = readFormTableRows(field)
      const fromResult = Array.isArray(resultForVariants[heading])
        ? resultForVariants[heading]
        : Array.isArray(resultForVariants[fieldId])
          ? resultForVariants[fieldId]
          : null
      const draftRows = draftRowsByVariant[id]
      const resolvedRows =
        draftRows && draftRows.length > 0
          ? draftRows
          : id === 'main'
            ? lineItems.length > 0
              ? lineItems
              : fromForm || fromResult || []
            : fromForm && fromForm.length > 0
              ? fromForm
              : fromResult || []
      sources.push({
        columns,
        discount: resolveDiscountForVariant(id),
        fieldId,
        freight: resolveFreightForVariant(id),
        id,
        resultKey: fieldId,
        // Prefer live normalized main rows; fall back to form/result so copy
        // still has Product/Qty/Price when lineItemTable is briefly empty.
        rows: resolvedRows,
        total: resolveTotalEntryValue(id, 'total'),
      })
    })

    // API-only variants with no form field yet (legacy ALT/OPT + quote_2/quote_3 keys)
    ;(['main', 'alt', 'opt'] as const).forEach((id) => {
      if (seen.has(id)) return
      const keyCandidates =
        id === 'main'
          ? ['Line Item']
          : id === 'alt'
            ? ['quote_2 Line Item', 'ALT Line Item']
            : ['quote_3 Line Item', 'OPT Line Item']
      const key =
        keyCandidates.find((candidate) =>
          Array.isArray(resultForVariants[candidate]),
        ) || keyCandidates[0]
      const draftRows = draftRowsByVariant[id]
      const rows =
        draftRows && draftRows.length > 0
          ? draftRows
          : id === 'main'
            ? lineItems
            : Array.isArray(resultForVariants[key])
              ? resultForVariants[key]
              : []
      if (!rows.length && id !== 'main') return
      if (id === 'main' && !rows.length) return
      sources.push({
        discount: resolveDiscountForVariant(id),
        freight: resolveFreightForVariant(id),
        id,
        resultKey: key,
        rows,
        total: resolveTotalEntryValue(id, 'total'),
      })
    })

    return sources
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scalars from viewModel/formModel/result
  }, [
    draftRowsByVariant,
    formModel,
    lineItems,
    result,
    resultForVariants,
    tableFields,
    viewModel.totals,
  ])

  const quoteVariants = useMemo(
    () =>
      extractQuoteVariants({
        columns: lineItemColumns,
        formVariantTables,
        freight,
        lineItems,
        result: resultForVariants,
        taxRate,
      }),
    [
      freight,
      formVariantTables,
      lineItemColumns,
      lineItems,
      resultForVariants,
      taxRate,
    ],
  )

  const quoteEmptyMetaByVariant = useMemo(
    () => extractQuoteVariantEmptyMeta(result),
    [result],
  )

  const compareField = useMemo(
    () =>
      tableFields.find((field) => {
        const heading = getFieldHeading(field)
          .toLowerCase()
          .replace(/[\s_-]+/g, '')
        return heading === 'compare'
      }) || null,
    [tableFields],
  )

  const formCompareRows = useMemo(() => {
    if (!compareField) return null
    const fieldId = getFieldId(compareField)
    const fromForm = formModel?.[fieldId]
    // Compare panel reads this table only. Missing or empty rows stay empty
    // instead of being rebuilt from line items or quote_result.compare.
    return Array.isArray(fromForm) ? fromForm : []
  }, [compareField, formModel])

  const compareColumns = useMemo(
    () => effectiveDynamicColumns(compareField, formCompareRows || []),
    [compareField, formCompareRows],
  )

  const compareByVariant = useMemo(
    () => ({
      alt: resolveComparePayload(result, 'alt', formCompareRows || undefined),
      opt: resolveComparePayload(result, 'opt', formCompareRows || undefined),
    }),
    [formCompareRows, result],
  )

  const quoteDynamicTables = useMemo(() => {
    return tableFields
      .map((field) => {
        const type = String(field?.type || '')
          .toUpperCase()
          .replace(/[\s-]+/g, '_')
        if (type !== 'DYNAMIC_TABLE') return null
        const heading = getFieldHeading(field)
        if (resolveLineItemTableVariant(heading)) return null
        const compact = heading.toLowerCase().replace(/[\s_-]+/g, '')
        if (compact === 'compare' || compact.endsWith('compare')) return null
        const fieldId = getFieldId(field)
        const stored = formModel?.[fieldId]
        const fromResult = result?.[heading] ?? result?.[fieldId]
        const sourceRows = Array.isArray(stored) && stored.length
          ? (stored as Record<string, any>[])
          : Array.isArray(fromResult)
            ? (fromResult as Record<string, any>[])
            : []
        const schemaColumns = effectiveDynamicColumns(field, sourceRows)
        // An empty form array still renders the builder columns with one blank row.
        // Filled rows drop unused default columns and keep the keys that have values.
        const rows = sourceRows.length
          ? sourceRows
          : [{ _rowId: `${fieldId}-empty` }]
        return {
          columns: columnsForFilledDynamicTable(schemaColumns, rows),
          fieldId,
          rows,
          title: stripQuoteVariantLabel(heading),
          variantId: resolveQuoteFieldVariant(heading),
        }
      })
      .filter(Boolean) as {
      columns: ReturnType<typeof effectiveDynamicColumns>
      fieldId: string
      rows: Record<string, any>[]
      title: string
      variantId: QuoteVariantId
    }[]
  }, [formModel, result, tableFields])

  useEffect(() => {
    if (activeQuoteTabId === 'compare') return
    if (!quoteVariants.some((variant) => variant.id === activeQuoteTabId)) {
      setActiveQuoteTabId(quoteVariants[0]?.id || 'main')
    }
  }, [activeQuoteTabId, quoteVariants])

  const activeQuoteVariant =
    activeQuoteTabId === 'compare'
      ? null
      : quoteVariants.find((variant) => variant.id === activeQuoteTabId) ||
        quoteVariants[0] ||
        null

  const activeVariantId = activeQuoteVariant?.id || 'main'
  const isCompareTab = activeQuoteTabId === 'compare'
  const activeOrderNumber = useMemo(() => {
    const field = formFields.find((item) => {
      const heading = getFieldHeading(item)
      const compact = stripQuoteVariantLabel(heading)
        .toLowerCase()
        .replace(/[\s_-]+/g, '')
      return (
        compact === 'ordernumber' &&
        resolveQuoteFieldVariant(heading) === activeVariantId
      )
    })
    if (!field) return null
    const fieldId = getFieldId(field)
    const drafted = draftOrderByVariant[activeVariantId]
    if (drafted != null && drafted.trim() !== '') {
      return { field, fieldId, value: drafted }
    }
    const keys = [
      field.id,
      field.jsonId,
      field.name,
      fieldId,
      getFieldHeading(field),
    ].filter(Boolean)
    let value = ''
    for (const key of keys) {
      const fromForm = formModel?.[key]
      const fromResult = result?.[key]
      const picked = [fromForm, fromResult].find(
        (item) =>
          item != null &&
          typeof item !== 'object' &&
          String(item).trim() !== '',
      )
      if (picked != null) {
        value = String(picked)
        break
      }
    }
    return { field, fieldId, value }
  }, [activeVariantId, draftOrderByVariant, formFields, formModel, result])
  const previewQuoteType = previewQuoteTypeForVariant(activeQuoteTabId)
  const isEmptyActiveVariant =
    !isCompareTab &&
    Boolean(activeQuoteVariant && activeQuoteVariant.itemCount <= 0)

  const previewQuoteTypeRef = useRef<string | null>(null)

  const loadDocumentPreview = async (quoteType: string) => {
    if (!documentTemplateJson || !quoteType) return
    previewQuoteTypeRef.current = quoteType
    setPreviewLoading(true)
    try {
      const { data, error } = await previewDocument({
        formData: buildDocumentPreviewFormData(formModel),
        quoteType,
        templateJson: documentTemplateJson,
        ...(workflowFormId ? { formId: workflowFormId } : {}),
      })
      if (error || !data?.pdfBase64) {
        showToast({
          message: error || t`Document preview failed`,
          variant: 'error',
        })
        return
      }
      const objectUrl = pdfBase64ToObjectUrl(data.pdfBase64)
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = objectUrl
      setPreviewUrl(objectUrl)
      setPreviewFileName(data.fileName || 'quote.pdf')
    } finally {
      setPreviewLoading(false)
    }
  }

  const selectPaneMode = (mode: QuotePaneMode) => {
    if (mode === 'preview' && (isCompareTab || isEmptyActiveVariant)) return
    if (mode === 'preview' && !documentTemplateJson) {
      showToast({
        message: t`Document preview is not available for this workflow`,
        variant: 'error',
      })
      return
    }
    if (mode === 'preview' && !previewQuoteType) return
    setPaneMode(mode)
    if (mode === 'preview' && previewQuoteType) {
      void loadDocumentPreview(previewQuoteType)
    }
  }

  useEffect(() => {
    // Compare has no single quoteType — leave preview mode if user switches tabs.
    if (isCompareTab && paneMode === 'preview') {
      setPaneMode('agent_review')
      previewQuoteTypeRef.current = null
      return
    }
    // Refresh PDF when switching Quote 1 / 2 / 3 while already in preview.
    if (
      paneMode === 'preview' &&
      previewQuoteType &&
      previewQuoteTypeRef.current !== previewQuoteType
    ) {
      void loadDocumentPreview(previewQuoteType)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only on tab change
  }, [isCompareTab, paneMode, previewQuoteType])

  const previewDisabled = isCompareTab || isEmptyActiveVariant
  const activeFreight =
    activeQuoteVariant?.freight ?? resolveFreightForVariant(activeVariantId)
  const activeDiscount =
    activeQuoteVariant?.discount ?? resolveDiscountForVariant(activeVariantId)
  const activeFormTable = formVariantTables.find(
    (entry) => entry.id === activeVariantId,
  )
  const activeColumns =
    activeQuoteVariant?.columns?.length
      ? activeQuoteVariant.columns
      : activeFormTable?.columns?.length
        ? activeFormTable.columns
        : lineItemColumns
  const activeTableFieldId = (() => {
    if (activeQuoteVariant?.fieldId) return activeQuoteVariant.fieldId
    if (activeFormTable?.fieldId) return activeFormTable.fieldId
    const byHeading = tableFields.find(
      (field) =>
        resolveLineItemTableVariant(getFieldHeading(field)) === activeVariantId,
    )
    if (byHeading) return getFieldId(byHeading)
    // Only fall back to the primary Line Item field on the main tab.
    if (activeVariantId === 'main' && viewModel.lineItemTable?.field) {
      return getFieldId(viewModel.lineItemTable.field)
    }
    return undefined
  })()

  const variantResultKeys = useMemo(() => {
    const keys = collectQuoteVariantResultKeys(quoteVariants)
    quoteVariants.forEach((variant) => {
      if (variant.fieldId) keys.add(variant.fieldId)
      if (variant.resultKey) keys.add(variant.resultKey)
    })
    ;[
      'Line Item',
      'quote_2 Line Item',
      'quote_3 Line Item',
      'ALT Line Item',
      'OPT Line Item',
    ].forEach((key) => keys.add(key))
    return keys
  }, [quoteVariants])

  const displayLineItems = activeQuoteVariant?.rows ?? lineItems

  const activeVariantTotals = useMemo(() => {
    if (isCompareTab || isEmptyActiveVariant) {
      return {
        discount: 0,
        freight: 0,
        gross: 0,
        hst: 0,
        subtotal: 0,
        total: 0,
      }
    }
    const computed = buildQuoteTotals(
      displayLineItems,
      activeFreight,
      taxRate,
      activeColumns,
      activeDiscount,
    )
    // Prefer API Total for the active tab when present (sample quote_result shape).
    const apiTotal = resolveTotalEntryValue(activeVariantId, 'total')
    const apiHst = resolveTotalEntryValue(activeVariantId, 'tax')
    const apiSubtotal = resolveTotalEntryValue(activeVariantId, 'subtotal')
    // Prefer computed line-discount $ over the quote-level Discount field (often 0).
    const apiDiscount = resolveTotalEntryValue(activeVariantId, 'discount')
    return {
      ...computed,
      discount: computed.discount || apiDiscount || 0,
      freight: activeFreight,
      hst: apiHst || computed.hst,
      subtotal: apiSubtotal || computed.subtotal,
      total: apiTotal || computed.total,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resolveTotalEntryValue uses viewModel/formModel
  }, [
    activeColumns,
    activeDiscount,
    activeFreight,
    activeVariantId,
    displayLineItems,
    formModel,
    isCompareTab,
    isEmptyActiveVariant,
    taxRate,
    viewModel.totals,
  ])

  const [computedTotals, setComputedTotals] =
    useState<QuoteTotals>(initialTotals)
  const [draftTables, setDraftTables] = useState<
    Record<string, Record<string, any>[]>
  >({})
  const [activeEditId, setActiveEditId] = useState<string | null>(null)
  const totalsFromEditRef = useRef(false)

  useEffect(() => {
    // Don't clobber totals just updated from an in-table edit with a stale
    // formModel-derived total in the same turn.
    if (totalsFromEditRef.current) {
      totalsFromEditRef.current = false
      return
    }
    setComputedTotals(activeVariantTotals)
  }, [activeVariantTotals])

  const canEditField = (field: any | null) =>
    canEditAgentFormField(field, {
      hiddenFieldIds,
      onFieldChange,
      readOnly,
      readOnlyFieldIds,
    })

  const canViewField = (field: any | null) =>
    canViewAgentFormField(field, hiddenFieldIds)

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
    const id = field ? getFieldId(field) : ''
    if (id) {
      onFieldChange(id, value)
      return
    }
    if (resultKey && /^[0-9a-f-]{36}$/i.test(resultKey)) onFieldChange(resultKey, value)
  }

  const readScalarText = (field: any | null, extraKeys: string[] = []) => {
    const keys = [
      ...(field
        ? [field.id, field.jsonId, field.name, getFieldId(field), getFieldHeading(field)]
        : []),
      ...extraKeys,
    ].filter(Boolean)
    for (const key of keys) {
      const picked = [formModel?.[key], result?.[key]].find(
        (item) =>
          item != null &&
          typeof item !== 'object' &&
          String(item).trim() !== '',
      )
      if (picked != null) return String(picked)
    }
    const wanted = new Set(
      extraKeys.map((key) =>
        stripQuoteVariantLabel(key).toLowerCase().replace(/[\s_-]+/g, ''),
      ),
    )
    if (field) {
      wanted.add(
        stripQuoteVariantLabel(getFieldHeading(field))
          .toLowerCase()
          .replace(/[\s_-]+/g, ''),
      )
    }
    for (const bag of [formModel, result]) {
      if (!bag || typeof bag !== 'object') continue
      for (const [key, item] of Object.entries(bag)) {
        const compact = stripQuoteVariantLabel(key)
          .toLowerCase()
          .replace(/[\s_-]+/g, '')
        if (!wanted.has(compact)) continue
        if (field && resolveQuoteFieldVariant(key) !== resolveQuoteFieldVariant(getFieldHeading(field))) {
          continue
        }
        if (item == null || typeof item === 'object') continue
        if (String(item).trim() === '') continue
        return String(item)
      }
    }
    return ''
  }

  const writeTable = (field: any | null, rows: Record<string, any>[]) => {
    if (!field) return
    const id = getFieldId(field)
    setDraftTables((prev) => ({ ...prev, [id]: rows }))
    onFieldChange?.(id, rows)
  }

  const findOrderNumberField = (variantId: QuoteVariantId) =>
    formFields.find((field) => {
      const heading = getFieldHeading(field)
      const compact = stripQuoteVariantLabel(heading)
        .toLowerCase()
        .replace(/[\s_-]+/g, '')
      return (
        compact === 'ordernumber' &&
        resolveQuoteFieldVariant(heading) === variantId
      )
    }) || null

  const variantScalarResultKey = (
    variantId: QuoteVariantId,
    kind: QuoteTotalEntry['kind'],
  ) => {
    if (kind === 'other') return undefined
    const candidates = VARIANT_SCALAR_KEYS[variantId]?.[kind]
    return candidates?.[0]
  }

  const writeVariantTotals = (
    variantId: QuoteVariantId,
    totals: QuoteTotals,
  ) => {
    if (!onFieldChange) return
    const kinds: QuoteTotalEntry['kind'][] = [
      'subtotal',
      'discount',
      'freight',
      'tax',
      'total',
    ]
    kinds.forEach((kind) => {
      let value: number | null = null
      if (kind === 'subtotal') value = totals.subtotal
      if (kind === 'discount') value = totals.discount
      if (kind === 'freight') value = totals.freight
      if (kind === 'tax') value = totals.hst
      if (kind === 'total') value = totals.total
      if (value == null) return

      const entry = viewModel.totals.find(
        (item) =>
          item.kind === kind && (item.variant || 'main') === variantId,
      )
      const field =
        entry?.field ||
        formFields.find((item) => {
          const heading = getFieldHeading(item)
          if (resolveQuoteFieldVariant(heading) !== variantId) return false
          const compact = compactControl(stripQuoteVariantLabel(heading))
          if (kind === 'total' && compact.includes('subtotal')) return false
          const names =
            kind === 'tax' ? ['hst', 'gst', 'tax'] : [kind]
          return names.some(
            (name) => compact === name || compact.endsWith(name),
          )
        }) ||
        null
      // Write the variant's own field id. A loose result key such as
      // "Subtotal" would overwrite Quote 1.
      const resultKey = field
        ? undefined
        : entry?.resultKey || variantScalarResultKey(variantId, kind)
      if (!field && !resultKey) return
      writeField(field, value, resultKey)
    })
  }

  const persistTotals = (totals: QuoteTotals) => {
    writeVariantTotals(activeVariantId, totals)
  }

  const quoteSyncRef = useRef('')

  useEffect(() => {
    if (readOnly || !onFieldsChange) return
    const patch: Record<string, any> = {}

    const findScalarField = (
      variantId: QuoteVariantId,
      kind: 'discount' | 'freight' | 'subtotal' | 'tax' | 'total',
    ) =>
      formFields.find((field) => {
        const heading = getFieldHeading(field)
        if (resolveQuoteFieldVariant(heading) !== variantId) return false
        const compact = compactControl(stripQuoteVariantLabel(heading))
        if (kind === 'total' && compact.includes('subtotal')) return false
        const names = kind === 'tax' ? ['hst', 'gst', 'tax'] : [kind]
        return names.some((name) => compact === name || compact.endsWith(name))
      }) || null

    const readShownText = (field: any, extraKeys: string[] = []) => {
      const keys = [
        field?.id,
        field?.jsonId,
        field?.name,
        getFieldId(field),
        getFieldHeading(field),
        ...extraKeys,
      ].filter(Boolean)
      for (const key of keys) {
        const picked = [formModel?.[key], result?.[key]].find(
          (item) =>
            item != null &&
            typeof item !== 'object' &&
            String(item).trim() !== '',
        )
        if (picked != null) return String(picked)
      }
      return ''
    }

    quoteVariants.forEach((variant) => {
      const columns = variant.columns || []
      if (variant.fieldId && variant.itemCount > 0) {
        const stored = formModel?.[variant.fieldId]
        const storedSig = lineValueSignature(
          normalizeLineItemRows(Array.isArray(stored) ? stored : [], columns),
        )
        const shownSig = lineValueSignature(variant.rows)
        if (storedSig !== shownSig) {
          patch[variant.fieldId] = toFormTableRows(variant.rows, columns)
        }
      }

      if (variant.itemCount > 0) {
        const variantFreight = Number(variant.freight ?? 0)
        const totals = buildQuoteTotals(
          variant.rows,
          variantFreight,
          taxRate,
          columns,
          variant.discount,
        )
        const mainTotalField = findScalarField('main', 'total')
        const mainTotal = mainTotalField
          ? Number(formModel?.[getFieldId(mainTotalField)])
          : NaN
        // Quote 2/3 formulas add Quote 1's subtotal, so a stored total can
        // equal Quote 1 while the tab is showing this quote's lines.
        const shownTotal =
          variant.id !== 'main' &&
          variant.total > 0 &&
          !sameStoredNumber(variant.total, mainTotal)
            ? variant.total
            : totals.total
        const shown: Record<string, number> = {
          discount: totals.discount,
          freight: variantFreight,
          subtotal: totals.subtotal,
          tax: totals.hst,
          total: shownTotal,
        }
        ;(['subtotal', 'discount', 'freight', 'tax', 'total'] as const).forEach(
          (kind) => {
            const field = findScalarField(variant.id, kind)
            if (!field) return
            const id = getFieldId(field)
            const next = shown[kind]
            if (!Number.isFinite(next) || sameStoredNumber(formModel?.[id], next)) {
              return
            }
            patch[id] = next
          },
        )
      }

      const orderField = formFields.find((field) => {
        const heading = getFieldHeading(field)
        return (
          compactControl(stripQuoteVariantLabel(heading)) === 'ordernumber' &&
          resolveQuoteFieldVariant(heading) === variant.id
        )
      })
      if (orderField) {
        const drafted = draftOrderByVariant[variant.id]
        const shown =
          drafted != null && drafted.trim() !== ''
            ? drafted
            : readShownText(orderField)
        const id = getFieldId(orderField)
        if (shown && String(formModel?.[id] ?? '') !== shown) patch[id] = shown
      }

      const remarksField = formFields.find((field) => {
        const heading = getFieldHeading(field)
        return (
          /remark/i.test(heading) &&
          resolveQuoteFieldVariant(heading) === variant.id
        )
      })
      if (remarksField) {
        const shown = readShownText(
          remarksField,
          VARIANT_REMARKS_KEYS[variant.id] || [],
        )
        const id = getFieldId(remarksField)
        if (shown && String(formModel?.[id] ?? '') !== shown) patch[id] = shown
      }
    })

    tableFields.forEach((field) => {
      const type = String(field?.type || '')
        .toUpperCase()
        .replace(/[\s-]+/g, '_')
      if (type !== 'DYNAMIC_TABLE') return
      const heading = getFieldHeading(field)
      if (resolveLineItemTableVariant(heading)) return
      const compact = compactControl(heading)
      if (compact === 'compare' || compact.endsWith('compare')) return
      const id = getFieldId(field)
      const stored = formModel?.[id]
      if (Array.isArray(stored) && stored.length > 0) return
      const fromResult = result?.[heading] ?? result?.[id]
      if (!Array.isArray(fromResult) || fromResult.length === 0) return
      patch[id] = fromResult
    })

    const keys = Object.keys(patch)
    if (!keys.length) return
    const signature = JSON.stringify(patch)
    if (quoteSyncRef.current === signature) return
    quoteSyncRef.current = signature
    onFieldsChange(patch)
  }, [
    draftOrderByVariant,
    formFields,
    formModel,
    onFieldsChange,
    quoteVariants,
    readOnly,
    result,
    tableFields,
    taxRate,
  ])

  /** Copy line items + totals (+ remarks) from one quote tab into another. */
  const copyVariantFrom = (
    sourceId: QuoteVariantId,
    targetId: QuoteVariantId,
  ) => {
    if (!onFieldChange || readOnly) return
    const source = quoteVariants.find((variant) => variant.id === sourceId)
    const target = quoteVariants.find((variant) => variant.id === targetId)
    if (!source || !target || source.itemCount <= 0) return

    const sourceForm = formVariantTables.find((entry) => entry.id === sourceId)
    const targetForm = formVariantTables.find((entry) => entry.id === targetId)
    // Resolve columns/field ids from the live form fields (most reliable).
    const sourceField = tableFields.find(
      (field) => resolveLineItemTableVariant(getFieldHeading(field)) === sourceId,
    )
    const targetField = tableFields.find(
      (field) => resolveLineItemTableVariant(getFieldHeading(field)) === targetId,
    )
    const sourceColumns =
      (sourceField?.settings?.specific?.tableColumns?.length
        ? sourceField.settings.specific.tableColumns
        : sourceForm?.columns?.length
          ? sourceForm.columns
          : source.columns?.length
            ? source.columns
            : lineItemColumns) || []
    const targetColumns =
      (targetField?.settings?.specific?.tableColumns?.length
        ? targetField.settings.specific.tableColumns
        : targetForm?.columns?.length
          ? targetForm.columns
          : target.columns?.length
            ? target.columns
            : sourceColumns) || []
    // Prefer live main lineItems (normalized + notes); variant.rows can be UUID-only.
    const sourceRows =
      sourceId === 'main' && lineItems.length > 0
        ? lineItems
        : sourceForm?.rows?.length
          ? sourceForm.rows
          : source.rows
    // Remap via canonical Product/Qty/Price — source & target tables use different UUIDs.
    const normalized = remapLineItemRows(
      sourceRows,
      sourceColumns,
      targetColumns,
    )
    // Dual-write: target column UUIDs + canonical Product/Qty/Price keys.
    // Also run the shared header→UUID mapper so Product/Qty/Price land even
    // when column titles differ slightly between quote tables.
    const mappedByHeader = mapExternalRowsToTableColumns(
      normalized,
      targetColumns,
    )
    const discountColumnId = (columns: any[]) =>
      (columns || []).find((col) => {
        const name = String(col?.name || col?.label || '')
          .toLowerCase()
          .replace(/[\s_%()-]+/g, '')
        return name === 'discount' || name === 'disc' || name.startsWith('discount')
      })?.id
    const asDiscountNumber = (value: unknown) => {
      if (value == null || typeof value === 'object') return NaN
      const num = Number(String(value).replace(/[^0-9.]/g, ''))
      return Number.isFinite(num) ? num : NaN
    }
    const readRowDiscount = (row: Record<string, any>, columns: any[]) => {
      const colId = discountColumnId(columns)
      const candidates: unknown[] = [row?.Discount, colId != null ? row?.[colId] : undefined]
      Object.entries(row || {}).forEach(([key, value]) => {
        if (key.startsWith('_')) return
        const compact = key.toLowerCase().replace(/[\s_%-]+/g, '')
        if (compact === 'discount' || compact === 'disc' || compact.includes('discount')) {
          candidates.push(value)
        }
      })
      const positive = candidates.find((value) => asDiscountNumber(value) > 0)
      if (positive !== undefined) return positive
      const qty = asDiscountNumber(row?.Qty)
      const price = asDiscountNumber(row?.Price)
      const subtotal = asDiscountNumber(row?.Subtotal)
      const gross = qty * price
      if (gross > 0 && Number.isFinite(subtotal) && subtotal >= 0 && gross - subtotal > 0.009) {
        return Math.round((1 - subtotal / gross) * 10000) / 100
      }
      return ''
    }
    const rawSourceRows =
      sourceForm?.rows?.length ? sourceForm.rows : source.rows || []
    const formRows = normalizeLineItemRows(
      toFormTableRows(normalized, targetColumns).map((row, index) => {
        const sourceRow = sourceRows[index] || {}
        const rawRow = rawSourceRows[index] || {}
        const discount =
          readRowDiscount(sourceRow, sourceColumns) ||
          readRowDiscount(rawRow, sourceColumns) ||
          readRowDiscount(row, targetColumns)
        const next: Record<string, any> = {
          ...(mappedByHeader[index] || {}),
          ...row,
        }
        if (discount !== '' && asDiscountNumber(discount) > 0) {
          next.Discount = discount
          const targetDiscountId = discountColumnId(targetColumns)
          if (targetDiscountId) next[targetDiscountId] = discount
        }
        const sourceRecord = sourceRow as Record<string, any>
        const rawRecord = rawRow as Record<string, any>
        const mode =
          sourceRecord._discountMode ||
          sourceRecord.DiscountMode ||
          rawRecord._discountMode ||
          rawRecord.DiscountMode
        if (mode) next._discountMode = mode
        return next
      }),
      targetColumns,
    )
    // Keep a local draft so the empty panel swaps to the table immediately.
    setDraftRowsByVariant((prev) => ({ ...prev, [targetId]: formRows }))
    const lineFieldId =
      (targetField ? getFieldId(targetField) : '') ||
      targetForm?.fieldId ||
      target.fieldId ||
      ''
    if (lineFieldId) {
      onFieldChange(lineFieldId, toFormTableRows(formRows, targetColumns))
    }

    const freight = Number(source.freight ?? 0)
    const totals = buildQuoteTotals(
      formRows,
      freight,
      taxRate,
      targetColumns,
      Number(source.discount ?? 0),
    )
    const withSourceTotal = {
      ...totals,
      freight,
      // Prefer source grand total when present; otherwise use recomputed from copied rows.
      total:
        source.total && Number.isFinite(source.total) && source.total > 0
          ? source.total
          : totals.total,
    }
    writeVariantTotals(targetId, withSourceTotal)

    const sourceOrderField = findOrderNumberField(sourceId)
    const targetOrderField = findOrderNumberField(targetId)
    const orderFallbacks =
      sourceId === 'alt'
        ? ['quote_2 Order Number', 'ALT Order Number']
        : sourceId === 'opt'
          ? ['quote_3 Order Number', 'OPT Order Number']
          : ['Order Number']
    const copiedOrder = readScalarText(sourceOrderField, orderFallbacks)
    if (targetOrderField && copiedOrder) {
      writeField(targetOrderField, copiedOrder)
      setDraftOrderByVariant((prev) => ({ ...prev, [targetId]: copiedOrder }))
    }

    // Copy remarks when present on the source quote.
    const sourceRemarksKeys = VARIANT_REMARKS_KEYS[sourceId]
    const targetRemarksKeys = VARIANT_REMARKS_KEYS[targetId]
    const remarksEntry = viewModel.longTextEntries.find((entry) => {
      const label = entry.label || entry.resultKey || ''
      return (
        resolveQuoteFieldVariant(label) === sourceId &&
        /remark/i.test(label)
      )
    })
    const remarksFromResult = sourceRemarksKeys
      .map((key) => result?.[key])
      .find((value) => value !== undefined && value !== null)
    const remarksValue = remarksEntry
      ? resolveDisplayValue(
          remarksEntry.field,
          remarksEntry.value,
          remarksEntry.resultKey,
        )
      : remarksFromResult
    if (
      remarksValue !== undefined &&
      remarksValue !== null &&
      String(remarksValue).trim() !== ''
    ) {
      const targetRemarksEntry = viewModel.longTextEntries.find((entry) => {
        const label = entry.label || entry.resultKey || ''
        return (
          resolveQuoteFieldVariant(label) === targetId &&
          /remark/i.test(label)
        )
      })
      writeField(
        targetRemarksEntry?.field || null,
        remarksValue,
        targetRemarksEntry?.resultKey || targetRemarksKeys[0],
      )
    }

    // Copy quote-scoped dynamic tables (Line Traceability) onto the target quote.
    const dynamicTableBase = (field: any) =>
      stripQuoteVariantLabel(getFieldHeading(field))
        .toLowerCase()
        .replace(/[\s_-]+/g, '')
    const isDynamicTableField = (field: any) =>
      String(field?.type || '')
        .toUpperCase()
        .replace(/[\s-]+/g, '_') === 'DYNAMIC_TABLE'
    const readStoredRows = (field: any) => {
      const keys = [field?.id, field?.jsonId, getFieldId(field), getFieldHeading(field)]
        .filter(Boolean)
        .map((key) => String(key))
      for (const key of keys) {
        const value = formModel?.[key]
        if (Array.isArray(value) && value.length) return value as Record<string, any>[]
      }
      for (const key of keys) {
        const value = result?.[key]
        if (
          Array.isArray(value) &&
          value.length &&
          value.every((row) => row && typeof row === 'object')
        ) {
          return value as Record<string, any>[]
        }
      }
      return []
    }
    const sourceDynamic = tableFields.filter((field) => {
      if (!isDynamicTableField(field)) return false
      const heading = getFieldHeading(field)
      if (resolveLineItemTableVariant(heading)) return false
      const base = dynamicTableBase(field)
      if (!base || base === 'compare' || base.endsWith('compare')) return false
      return resolveQuoteFieldVariant(heading) === sourceId
    })
    const targetDynamic = tableFields.filter((field) => {
      if (!isDynamicTableField(field)) return false
      return resolveQuoteFieldVariant(getFieldHeading(field)) === targetId
    })
    sourceDynamic.forEach((sourceField) => {
      const base = dynamicTableBase(sourceField)
      const targetField = targetDynamic.find(
        (field) => dynamicTableBase(field) === base,
      )
      if (!targetField) return
      const sourceRows = readStoredRows(sourceField).filter((row) =>
        Object.entries(row || {}).some(
          ([key, value]) => !String(key).startsWith('_') && dynamicCellFilled(value),
        ),
      )
      if (!sourceRows.length) return
      const sourceCols = sourceField?.settings?.specific?.tableColumns || []
      const targetCols = targetField?.settings?.specific?.tableColumns || []
      const copied = sourceRows.map((row) => {
        const next: Record<string, any> = { ...row }
        delete next._rowId
        sourceCols.forEach((col: any) => {
          const match = targetCols.find(
            (targetCol: any) =>
              stripQuoteVariantLabel(String(targetCol?.name || targetCol?.label || ''))
                .toLowerCase()
                .replace(/[\s_-]+/g, '') ===
              stripQuoteVariantLabel(String(col?.name || col?.label || ''))
                .toLowerCase()
                .replace(/[\s_-]+/g, ''),
          )
          if (match?.id && col?.id && row[col.id] != null) next[match.id] = row[col.id]
        })
        return next
      })
      const traceFieldId = getFieldId(targetField)
      if (traceFieldId) onFieldChange(traceFieldId, copied)
    })

    totalsFromEditRef.current = true
    setComputedTotals(withSourceTotal)
    setCopiedFromByVariant((prev) => ({ ...prev, [targetId]: sourceId }))
    setActiveQuoteTabId(targetId)
    showToast({
      message: t`Copied from ${QUOTE_VARIANT_META[sourceId].shortLabel}`,
      variant: 'success',
    })
  }

  const activeCopiedFromId =
    activeVariantId && !isCompareTab
      ? copiedFromByVariant[activeVariantId]
      : undefined
  const activeCopiedFromLabel = activeCopiedFromId
    ? QUOTE_VARIANT_META[activeCopiedFromId].shortLabel
    : null

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
    options?: { className?: string; compact?: boolean; inline?: boolean },
  ) => {
    const { canEdit, display, raw } = resolveScalarEntry(entry)
    const fieldId = entry.field ? getFieldId(entry.field) : entry.resultKey

    return (
      <HoverEditShell
        activeEditId={activeEditId}
        canEdit={canEdit}
        className={options?.className}
        editor={renderScalarEditor(entry, raw, options?.compact)}
        fieldId={fieldId}
        inline={options?.inline}
        label={controlLabel(entry.field, entry.label)}
        onActivate={setActiveEditId}
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

  const canEditTotalEntry = (entry: QuoteTotalEntry) => {
    if (readOnly || !onFieldChange) return false
    // Subtotal / HST / Total are driven by line items + discount/freight.
    if (
      entry.kind === 'subtotal' ||
      entry.kind === 'total' ||
      entry.kind === 'tax'
    ) {
      return false
    }
    if (entry.kind === 'discount') {
      // Discount $ is derived from line-item discounts — edit those cells instead.
      return false
    }
    if (entry.kind === 'freight') {
      return true
    }
    if (entry.field) return canEditField(entry.field)
    return false
  }

  const commitTotalEntry = (entry: QuoteTotalEntry, raw: unknown) => {
    const parsed = Number(raw)
    if (!Number.isFinite(parsed)) return

    let next = { ...computedTotals }
    if (entry.kind === 'freight') {
      next = buildQuoteTotals(
        displayLineItems,
        parsed,
        taxRate,
        activeColumns,
        computedTotals.discount,
      )
    } else if (entry.kind === 'discount') {
      next = buildQuoteTotals(
        displayLineItems,
        computedTotals.freight,
        taxRate,
        activeColumns,
        parsed,
      )
    } else if (entry.kind === 'tax') {
      next = {
        ...computedTotals,
        hst: Number(parsed.toFixed(2)),
        total: Number(
          (
            Math.max(0, computedTotals.subtotal - computedTotals.discount) +
            computedTotals.freight +
            parsed
          ).toFixed(2),
        ),
      }
    } else if (entry.kind === 'other') {
      writeField(entry.field, parsed, entry.resultKey)
      return
    } else {
      return
    }

    totalsFromEditRef.current = true
    setComputedTotals(next)
    persistTotals(next)
    writeField(entry.field, parsed, entry.resultKey)
  }

  const totalDisplayValue = (entry: QuoteTotalEntry) => {
    if (entry.kind === 'subtotal') {
      return computedTotals.gross > 0
        ? computedTotals.gross
        : computedTotals.subtotal
    }
    if (entry.kind === 'discount') return computedTotals.discount
    if (entry.kind === 'freight') return computedTotals.freight
    if (entry.kind === 'tax') return computedTotals.hst
    if (entry.kind === 'total') return computedTotals.total
    return resolveDisplayValue(entry.field, entry.value, entry.resultKey)
  }

  const breakdownTotals = useMemo(() => {
    const kinds: QuoteTotalEntry['kind'][] = [
      'subtotal',
      'discount',
      'freight',
      'tax',
    ]
    return kinds
      .map((kind) => {
        const existing = viewModel.totals.find(
          (entry) =>
            entry.kind === kind &&
            (entry.variant || 'main') === activeVariantId,
        )
        if (existing) {
          return {
            ...existing,
            label: displayQuoteTotalLabel(kind, existing.label),
          }
        }
        // Synthesize from API scalars when form mapping is missing
        const value = resolveTotalEntryValue(activeVariantId, kind)
        if (kind === 'discount' && !value) {
          // Still show Discount row so tab controls stay consistent
        }
        return {
          field: null,
          kind,
          label: displayQuoteTotalLabel(kind),
          resultKey: `${activeVariantId}:${kind}`,
          value,
          variant: activeVariantId,
        } satisfies QuoteTotalEntry
      })
      .filter((entry) => {
        // Always show the core breakdown rows for the active tab
        return (
          entry.kind === 'subtotal' ||
          entry.kind === 'discount' ||
          entry.kind === 'freight' ||
          entry.kind === 'tax'
        )
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeVariantId, formModel, result, viewModel.totals, computedTotals])

  const activeGrandTotal: QuoteTotalEntry = useMemo(() => {
    const existing = viewModel.totals.find(
      (entry) =>
        entry.kind === 'total' && (entry.variant || 'main') === activeVariantId,
    )
    if (existing) {
      return {
        ...existing,
        label: displayQuoteTotalLabel('total', existing.label),
      }
    }
    return {
      field: null,
      kind: 'total',
      label: 'Total',
      resultKey: `${activeVariantId}:total`,
      value: computedTotals.total,
      variant: activeVariantId,
    }
  }, [activeVariantId, computedTotals.total, viewModel.totals])

  const lineItemField =
    (activeTableFieldId &&
      tableFields.find((field) => getFieldId(field) === activeTableFieldId)) ||
    viewModel.lineItemTable?.field ||
    null
  const lineItemsVisible = canViewField(lineItemField)
  const lineItemsEditable =
    (Boolean(viewModel.lineItemTable) || formVariantTables.length > 0) &&
    (lineItemField ? canEditField(lineItemField) : Boolean(onFieldChange))

  useEffect(() => {
    if (!onQuoteTotalChange) return
    const total = computedTotals?.total
    onQuoteTotalChange(
      total !== undefined && total !== null && Number.isFinite(Number(total))
        ? Number(total)
        : null,
    )
  }, [computedTotals.total, onQuoteTotalChange])

  const headerEntries = [viewModel.titleEntry, ...viewModel.metaEntries].filter(
    (entry): entry is QuoteScalarEntry => {
      if (!entry) return false
      if (entry.field && !canViewField(entry.field)) return false
      // Totals / discounts / remarks belong to the tab breakdown, not the header.
      const label = entry.label || entry.resultKey || ''
      const variant = resolveQuoteFieldVariant(label)
      if (variant !== 'main' && /^(alt|opt)/i.test(label.trim())) return false
      const compact = label.toLowerCase().replace(/[\s_-]+/g, '')
      if (
        compact.includes('discount') ||
        compact.includes('subtotal') ||
        compact.includes('freight') ||
        compact.includes('ordernumber') ||
        compact === 'hst' ||
        compact === 'total' ||
        compact.endsWith('total') ||
        compact.includes('remark')
      ) {
        return false
      }
      return true
    },
  )

  const scalarLabel = (entry: QuoteScalarEntry) => {
    const base = controlLabel(entry.field, entry.label) || entry.label
    const sameLabelCount = headerEntries.filter(
      (other) =>
        (controlLabel(other.field, other.label) || other.label)
          .trim()
          .toLowerCase() === base.trim().toLowerCase(),
    ).length
    if (sameLabelCount > 1) return entry.resultKey || base
    return base
  }

  const renderHeaderField = (entry: QuoteScalarEntry) => {
    const resolved = resolveScalarEntry(entry)
    const label = scalarLabel(entry)

    // One row: "Label : Value" — label never wraps; value truncates in place.
    return (
      <div
        className='flex min-w-0 flex-nowrap items-baseline gap-1.5 text-left text-sm leading-5 font-normal text-gray-12'
        key={entry.resultKey}
      >
        <span className='shrink-0 whitespace-nowrap font-bold'>{label}:</span>
        <HoverEditShell
          activeEditId={activeEditId}
          canEdit={resolved.canEdit}
          className='min-w-0 flex-1 overflow-hidden'
          editor={renderScalarEditor(entry, resolved.raw, true)}
          fieldId={entry.field ? getFieldId(entry.field) : entry.resultKey}
          label={label}
          onActivate={setActiveEditId}
        >
          <TruncatedExpandText
            className='w-full'
            value={resolved.display || 'NA'}
          />
        </HoverEditShell>
      </div>
    )
  }

  const renderTotalRow = (
    entry: QuoteTotalEntry,
    options?: { bold?: boolean },
  ) => {
    const canEdit = canEditTotalEntry(entry)
    const value = Number(totalDisplayValue(entry)) || 0
    const fieldId = entry.field ? getFieldId(entry.field) : entry.resultKey
    const quoteTotalLabel = `${QUOTE_VARIANT_META[activeVariantId]?.shortLabel || 'Quote'} Total`
    const rowLabel =
      entry.kind === 'total'
        ? quoteTotalLabel
        : displayQuoteTotalLabel(entry.kind, entry.label)
    const display =
      entry.kind === 'discount' && value > 0
        ? `-$${toMoney(value)}`
        : `$${toMoney(value)}`

    return (
      <div
        className={cn(
          'grid grid-cols-[minmax(0,1fr)_10rem] items-baseline gap-x-6',
          options?.bold
            ? 'mt-2 border-t border-gray-2 pt-2 font-bold text-gray-12'
            : 'text-gray-11',
        )}
        key={entry.resultKey}
      >
        <span
          className={cn(
            'min-w-0 text-left',
            entry.kind === 'total' ? 'whitespace-normal' : 'truncate',
          )}
        >
          {rowLabel}
        </span>
        <HoverEditShell
          activeEditId={activeEditId}
          canEdit={canEdit}
          className={cn(
            'w-full justify-end text-right font-medium tabular-nums',
            options?.bold ? 'text-[var(--primary-11)]' : 'text-gray-12',
          )}
          editor={
            <InputNumber
              className='w-full'
              value={value}
              autoFocus
              onChange={(v) => commitTotalEntry(entry, v)}
            />
          }
          fieldId={fieldId}
          label={entry.label}
          onActivate={setActiveEditId}
        >
          <span
            className={cn(
              'block w-full text-right tabular-nums',
              !canEdit && 'pr-5',
            )}
          >
            {display}
          </span>
        </HoverEditShell>
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-4'>
      {documentTemplateJson && paneMode === 'preview' ? (
        <div className='flex flex-col gap-3'>
          <div className='flex items-center justify-between gap-3'>
            <Button
              aria-label={t`Back to quotation details`}
              color='gray'
              icon='lucide:arrow-left'
              label={t`Back`}
              size='sm'
              title={t`Back to quotation details`}
              type='button'
              variant='ghost'
              onClick={() => selectPaneMode('agent_review')}
            />
            <span className='inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--secondary-6)] bg-[var(--secondary-2)] px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-[var(--secondary-11)]'>
              <Icon className='size-3.5' icon='lucide:eye' />
              {t`Preview Mode`}
            </span>
          </div>
          <div className='flex min-h-[420px] flex-col overflow-hidden rounded-xl border border-gray-3 bg-surface-primary'>
            <DocumentPreviewViewer
              fileName={previewFileName}
              fileUrl={previewUrl}
              isLoading={previewLoading}
              isPdf
            />
          </div>
        </div>
      ) : (
        <div className='flex min-w-0 flex-col gap-4'>
          <div className='grid min-w-0 grid-cols-1 items-start gap-x-6 gap-y-2.5 text-left sm:grid-cols-2'>
            {headerEntries.map(renderHeaderField)}
          </div>

          {(viewModel.lineItemTable || formVariantTables.length > 0) &&
            lineItemsVisible &&
            (lineItems.length > 0 ||
              lineItemsEditable ||
              quoteVariants.some((variant) => variant.itemCount > 0) ||
              formVariantTables.length > 1) && (
              <div className='flex flex-col gap-3'>
                <QuoteVariantCards
                  activeId={activeQuoteTabId}
                  copiedFromLabel={activeCopiedFromLabel}
                  emptyMetaByVariant={quoteEmptyMetaByVariant}
                  variants={quoteVariants}
                  onSelect={(id) => {
                    setActiveQuoteTabId(id)
                    if (id === 'compare') return
                    const next = quoteVariants.find((variant) => variant.id === id)
                    if (!next) return
                    const fr = next.freight ?? resolveFreightForVariant(id)
                    const computed = buildQuoteTotals(
                      next.rows,
                      fr,
                      taxRate,
                      next.columns?.length ? next.columns : lineItemColumns,
                      resolveDiscountForVariant(id),
                    )
                    totalsFromEditRef.current = true
                    const hasRows = next.itemCount > 0
                    setComputedTotals({
                      ...computed,
                      discount: hasRows ? computed.discount : 0,
                      freight: hasRows ? fr : 0,
                      hst: hasRows ? computed.hst : 0,
                      subtotal: hasRows ? computed.subtotal : 0,
                      total: hasRows
                        ? next.total && Number.isFinite(next.total)
                          ? next.total
                          : computed.total
                        : 0,
                    })
                  }}
                />

                {!isCompareTab ? (
                <div className='flex flex-wrap items-center justify-between gap-3'>
                  {!isCompareTab && activeOrderNumber ? (
                    <div className='flex min-w-0 items-baseline gap-1.5 text-left text-sm text-gray-12'>
                      <span className='shrink-0 font-bold'>{t`Order Number`}:</span>
                      <HoverEditShell
                        activeEditId={activeEditId}
                        canEdit={
                          Boolean(onFieldChange) &&
                          !readOnly &&
                          canEditField(activeOrderNumber.field)
                        }
                        className='min-w-0'
                        editor={
                          <InputText
                            value={activeOrderNumber.value}
                            autoFocus
                            onChange={(value) => {
                              setDraftOrderByVariant((prev) => ({
                                ...prev,
                                [activeVariantId]: value,
                              }))
                              writeField(
                                activeOrderNumber.field,
                                value,
                                activeOrderNumber.fieldId,
                              )
                            }}
                          />
                        }
                        fieldId={activeOrderNumber.fieldId}
                        label={t`Order Number`}
                        onActivate={setActiveEditId}
                      >
                        <span className='truncate'>
                          {activeOrderNumber.value || 'NA'}
                        </span>
                      </HoverEditShell>
                    </div>
                  ) : (
                    <span />
                  )}
                  <div className='ml-auto flex shrink-0 items-center justify-end gap-3 text-right'>
                    <Button
                      aria-disabled={previewDisabled}
                      aria-label={t`Quote Preview`}
                      className={cn(
                        '!border-secondary-5 !bg-secondary-2 !text-secondary-11 hover:!bg-secondary-3',
                        previewDisabled &&
                          'pointer-events-none cursor-not-allowed opacity-50',
                      )}
                      color='secondary'
                      disabled={previewDisabled}
                      icon='lucide:eye'
                      label={t`Quote Preview`}
                      size='sm'
                      title={
                        previewDisabled
                          ? isEmptyActiveVariant
                            ? t`No data to preview`
                            : t`Select Quote 1, 2, or 3 to preview`
                          : undefined
                      }
                      type='button'
                      variant='outline'
                      onClick={() => selectPaneMode('preview')}
                    />
                    {!isCompareTab ? (
                      <div className='text-sm leading-5 font-normal text-gray-12'>
                        <span className='font-bold'>{t`Total`}:</span>{' '}
                        <span>${toMoney(computedTotals.total)}</span>
                      </div>
                    ) : null}
                  </div>
                </div>
                ) : null}

                {isCompareTab ? (
                  <QuoteComparePanel
                    compareByVariant={compareByVariant}
                    compareColumns={compareColumns}
                    emptyMetaByVariant={quoteEmptyMetaByVariant}
                    variants={quoteVariants}
                    onOpenVariant={(id) => setActiveQuoteTabId(id)}
                  />
                ) : isEmptyActiveVariant && activeQuoteVariant ? (
                  <QuoteVariantEmptyPanel
                    canCopy={Boolean(onFieldChange) && !readOnly}
                    emptyMeta={
                      activeQuoteVariant.id === 'alt' ||
                      activeQuoteVariant.id === 'opt'
                        ? quoteEmptyMetaByVariant[activeQuoteVariant.id]
                        : null
                    }
                    sources={quoteVariants}
                    variant={activeQuoteVariant}
                    onCopyFrom={(sourceId) =>
                      copyVariantFrom(sourceId, activeQuoteVariant.id)
                    }
                  />
                ) : (
                  <QuoteLineItemsTable
                    discount={activeDiscount}
                    freight={activeFreight}
                    items={displayLineItems}
                    readOnly={!lineItemsEditable}
                    tableColumns={activeColumns}
                    tableFieldId={activeTableFieldId}
                    taxRate={taxRate}
                    title={t`Line Items`}
                    workflow={workflow}
                    onFieldChange={(fieldId, value) => {
                      if (!onFieldChange) return
                      const rows = Array.isArray(value) ? value : []
                      if (activeQuoteVariant?.id) {
                        setDraftRowsByVariant((prev) => ({
                          ...prev,
                          [activeQuoteVariant.id]: rows,
                        }))
                      }
                      const targetId =
                        activeQuoteVariant?.fieldId ||
                        activeQuoteVariant?.resultKey ||
                        fieldId

                      if (
                        activeQuoteVariant?.fieldId ||
                        (activeQuoteVariant?.resultKey &&
                          activeQuoteVariant.id !== 'main')
                      ) {
                        onFieldChange(
                          targetId,
                          toFormTableRows(rows, activeColumns),
                        )
                        return
                      }

                      if (
                        quoteVariants.length > 1 &&
                        !activeQuoteVariant?.fieldId
                      ) {
                        const activeId = activeQuoteVariant?.id || 'main'
                        const tagged = rows.map((row) => ({
                          ...row,
                          QuoteType:
                            row.QuoteType ||
                            row['Quote Type'] ||
                            QUOTE_VARIANT_META[activeId].label,
                        }))
                        const kept = lineItems.filter(
                          (row) => resolveRowQuoteVariant(row) !== activeId,
                        )
                        onFieldChange(
                          fieldId,
                          toFormTableRows([...kept, ...tagged], activeColumns),
                        )
                        return
                      }

                      onFieldChange(fieldId, toFormTableRows(rows, activeColumns))
                    }}
                    onTotalsChange={(totals) => {
                      totalsFromEditRef.current = true
                      setComputedTotals((prev) =>
                        prev.subtotal === totals.subtotal &&
                        prev.discount === totals.discount &&
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
              </div>
            )}

          {!isCompareTab &&
            !isEmptyActiveVariant &&
            breakdownTotals.length > 0 && (
            <div className='flex justify-end border-t border-gray-3 pt-3 pr-2'>
              <div className='mr-2 flex w-full max-w-[26rem] flex-col gap-1.5 text-sm'>
                {breakdownTotals.map((entry) => renderTotalRow(entry))}
                {activeGrandTotal
                  ? renderTotalRow(activeGrandTotal, { bold: true })
                  : null}
              </div>
            </div>
          )}

          {!isCompareTab &&
            !isEmptyActiveVariant &&
            viewModel.longTextEntries
            .filter((entry) => {
              if (entry.field && !canViewField(entry.field)) return false
              const label = entry.label || entry.resultKey || ''
              const compact = label.toLowerCase().replace(/[\s_-]+/g, '')
              const variant = resolveQuoteFieldVariant(label)
              const isVariantScoped =
                compact.startsWith('quote') ||
                compact.startsWith('alt') ||
                compact.startsWith('opt') ||
                compact.startsWith('optional') ||
                compact === 'remarks' ||
                compact === 'remark'
              if (!isVariantScoped) return true
              return variant === activeVariantId
            })
            .map((entry) => {
              const { canEdit, display, raw } = resolveScalarEntry(entry)
              const fieldId = entry.field
                ? getFieldId(entry.field)
                : entry.resultKey
              return (
                <div className='flex flex-col gap-1.5' key={entry.resultKey}>
                  <HoverEditShell
                    activeEditId={activeEditId}
                    canEdit={canEdit}
                    editor={renderScalarEditor(entry, raw)}
                    fieldId={fieldId}
                    heading={
                      <h4 className='text-sm font-semibold text-gray-12'>
                        {/remark/i.test(entry.label || '')
                          ? t`Remarks`
                          : stripQuoteVariantLabel(entry.label || '')}
                      </h4>
                    }
                    label={controlLabel(entry.field, entry.label)}
                    onActivate={setActiveEditId}
                  >
                    <span className='text-sm leading-relaxed text-gray-12'>
                      {display || raw}
                    </span>
                  </HoverEditShell>
                </div>
              )
            })}

          {!isCompareTab &&
            quoteDynamicTables
              .filter((table) => table.variantId === activeVariantId)
              .map((table) => (
                <AgentFlatTable
                  allowAddRow={false}
                  allowDelete={false}
                  columns={table.columns}
                  icon='tabler:table'
                  key={table.fieldId}
                  readOnly
                  rows={normalizeAgentTableRows(table.rows, table.columns)}
                  title={table.title}
                  onChange={() => {}}
                />
              ))}

          {viewModel.listEntries.map((entry) => {
            if (entry.field && !canViewField(entry.field)) return null
            const items = Array.isArray(entry.value)
              ? entry.value.map(String)
              : String(entry.value || '')
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
            if (!items.length) return null

            return (
              <div
                className='flex flex-col gap-1.5 border-t border-gray-3 pt-2'
                key={entry.resultKey}
              >
                <h4 className='flex items-center gap-1.5 text-sm font-semibold text-gray-12'>
                  <Icon className='h-4 w-4 text-orange-9' icon='tabler:bulb' />
                  {stripQuoteVariantLabel(entry.label)}
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
            const tableKey = `${table.label || ''} ${table.resultKey || ''}`
              .toLowerCase()
              .replace(/[\s_-]+/g, '')
            // Compare lives in the Quotes → Compare tab — hide the raw form table.
            if (tableKey === 'compare' || tableKey.endsWith('compare')) {
              return null
            }
            const tableType = String(table.field?.type || '')
              .toUpperCase()
              .replace(/[\s-]+/g, '_')
            // DYNAMIC_TABLE values are column-id rows in formData and are
            // rendered on the matching quote tab.
            if (tableType === 'DYNAMIC_TABLE') return null
            if (
              variantResultKeys.has(table.resultKey) ||
              isQuoteVariantTableKey(table.resultKey) ||
              isQuoteVariantTableKey(table.label)
            ) {
              return null
            }
            const field = ensureOnDemandTable(table.field)
            if (field && !canViewField(field)) return null
            const rows = resolveTableRows(table)
            const editable =
              !readOnly &&
              Boolean(onFieldChange) &&
              (table.field ? canEditField(table.field) : false)

            if (!rows.length && !editable) return null

            return (
              <AgentFlatTable
                allowAddRow={
                  !String(table.label || '')
                    .toLowerCase()
                    .includes('hold item')
                }
                columns={field.settings?.specific?.tableColumns || []}
                icon='tabler:table'
                key={table.resultKey}
                readOnly={!editable}
                title={stripQuoteVariantLabel(table.label)}
                rows={normalizeAgentTableRows(
                  rows,
                  field.settings?.specific?.tableColumns || [],
                )}
                onChange={(nextRows) => writeTable(field, nextRows)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

export default QuoteAgentResultView
