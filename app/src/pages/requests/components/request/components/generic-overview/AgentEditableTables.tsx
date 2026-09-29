import { useEffect, useMemo, useRef, useState } from 'react'
import { mapExternalRowsToTableColumns } from '@/pages/requests/components/workflow-request/components/TableFieldRenderer'
import { getFormPanels } from '@/pages/requests/components/workflow-request/utils/gmailFormAttachment'
import AgentFlatTable, { normalizeAgentTableRows } from './AgentFlatTable'
import QuoteLineItemsTable, {
  normalizeLineItemRows,
} from './QuoteLineItemsTable'

const asBool = (value: unknown) =>
  value === true || value === 1 || value === 'true'

export const isShowTableAsEditable = (settings?: Record<string, unknown> | null) =>
  asBool(
    settings?.showTableAsEditable ??
      settings?.show_table_as_editable ??
      settings?.tableAsEditable ??
      settings?.editableTable,
  )

const isTableField = (field: any) => {
  const type = String(field?.type || '')
    .toUpperCase()
    .replace(/[\s-]+/g, '_')
  return type === 'TABLE' || type === 'DYNAMIC_TABLE' || type.includes('TABLE')
}

const normalizeHeading = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/s\b/g, '')

export const isLineItemHeading = (value: string) => {
  const normalized = normalizeHeading(value)
  return normalized.includes('line item') || normalized.includes('lineitem')
}

const getFieldHeading = (field: any) =>
  String(
    field?.label ||
      field?.displayLabel ||
      field?.name ||
      field?.settings?.general?.label ||
      field?.id ||
      '',
  )

const getFieldId = (field: any) =>
  String(field?.id || field?.jsonId || field?.name || '')

const getFieldValueKeys = (field: any) =>
  Array.from(
    new Set(
      [field?.id, field?.jsonId, field?.name, getFieldHeading(field)]
        .filter(Boolean)
        .map((key) => String(key)),
    ),
  )

const parseTableRows = (raw: unknown): Record<string, any>[] => {
  if (Array.isArray(raw)) return raw.filter((row) => row && typeof row === 'object')
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (!trimmed) return []
    try {
      const parsed = JSON.parse(trimmed)
      return Array.isArray(parsed)
        ? parsed.filter((row) => row && typeof row === 'object')
        : []
    } catch {
      return []
    }
  }
  return []
}

const rowHasValues = (row: Record<string, any>) =>
  Object.entries(row || {}).some(([key, value]) => {
    if (key === '_rowId' || key === '_approved') return false
    return value !== undefined && value !== null && String(value).trim() !== ''
  })

export const collectFormFields = (workflow: any): any[] => {
  const panels = getFormPanels(workflow)
  const formJson = workflow?.formJson
  const parsedJson =
    typeof formJson === 'string'
      ? (() => {
          try {
            return JSON.parse(formJson)
          } catch {
            return {}
          }
        })()
      : formJson || {}
  const secondary = Array.isArray(parsedJson?.secondaryPanels)
    ? parsedJson.secondaryPanels
    : []
  return [...panels, ...secondary].flatMap((panel: any) => panel?.fields || [])
}

export const collectFormTableFields = (workflow: any): any[] =>
  collectFormFields(workflow).filter(isTableField)

export const hasMatchingEditableTables = (
  workflow: any,
  requestData?: any,
) => {
  if (collectFormTableFields(workflow).length > 0) return true
  const agentResult = getAgentResultPayload(requestData)
  if (!agentResult || typeof agentResult !== 'object') return false
  return Object.values(agentResult).some(
    (value) =>
      Array.isArray(value) &&
      value.length > 0 &&
      value[0] &&
      typeof value[0] === 'object',
  )
}

const META_ROW_KEYS = new Set([
  '_rowId',
  '_approved',
  'Needs Engineering Review',
])

const inferColumnType = (key: string, sample: unknown) => {
  const normalized = normalizeHeading(key)
  if (
    normalized.includes('qty') ||
    normalized.includes('quantity') ||
    normalized === 'count'
  ) {
    return 'NUMBER'
  }
  if (
    normalized.includes('price') ||
    normalized.includes('amount') ||
    normalized.includes('subtotal') ||
    normalized.includes('total') ||
    normalized.includes('rate')
  ) {
    return 'CURRENCY_AMOUNT'
  }
  if (
    normalized.includes('description') ||
    normalized.includes('note') ||
    normalized.includes('remark')
  ) {
    return 'LONG_TEXT'
  }
  if (typeof sample === 'number') return 'NUMBER'
  return 'SHORT_TEXT'
}

export const buildSyntheticTableField = (
  heading: string,
  rows: Record<string, any>[],
) => {
  const keys = [
    ...new Set(rows.flatMap((row) => Object.keys(row || {}))),
  ].filter((key) => !META_ROW_KEYS.has(key))
  return {
    id: heading,
    label: heading,
    settings: {
      specific: {
        rowsType: 'ON_DEMAND',
        tableColumns: keys.map((key) => ({
          id: key,
          name: key,
          type: inferColumnType(key, rows[0]?.[key]),
        })),
      },
    },
    type: 'TABLE',
  }
}

const findMatchingAgentRows = (
  agentResult: Record<string, any> | null | undefined,
  heading: string,
): Record<string, any>[] | null => {
  if (!agentResult || typeof agentResult !== 'object') return null
  const want = normalizeHeading(heading)
  if (!want) return null

  for (const [key, value] of Object.entries(agentResult)) {
    if (!Array.isArray(value) || value.length === 0) continue
    if (!value[0] || typeof value[0] !== 'object') continue
    const got = normalizeHeading(key)
    if (got === want || got.includes(want) || want.includes(got)) {
      return value as Record<string, any>[]
    }
  }
  return null
}

const getAgentResultPayload = (requestData: any) =>
  requestData?.quoteAgentResponse?.quote_result ||
  requestData?.qualifyAgentResponse?.qualifier_result ||
  requestData?.agentResponse ||
  null

interface Props {
  fallbackHeading?: string
  fallbackRows?: Record<string, any>[]
  formModel?: Record<string, any>
  readOnly?: boolean
  requestData?: any
  workflow?: any
  onFieldChange?: (fieldId: string, value: any) => void
}

const AgentEditableTables = ({
  fallbackHeading = 'Line Item',
  fallbackRows,
  formModel = {},
  readOnly = false,
  requestData,
  workflow,
  onFieldChange,
}: Props) => {
  const tableFields = useMemo(
    () => collectFormTableFields(workflow),
    [workflow],
  )
  const agentResult = getAgentResultPayload(requestData)
  const seededFieldIds = useRef<Set<string>>(new Set())
  const [draftRows, setDraftRows] = useState<Record<string, Record<string, any>[]>>(
    {},
  )

  const tables = useMemo(() => {
    const matched = tableFields
      .map((field) => {
        const heading = getFieldHeading(field)
        const fieldId = getFieldId(field)
        const storedValue = getFieldValueKeys(field).reduce<unknown>(
          (found, key) => found ?? formModel?.[key],
          undefined,
        )
        const formRows = parseTableRows(storedValue)
        const agentRows =
          findMatchingAgentRows(agentResult, heading) ||
          (isLineItemHeading(heading) ? fallbackRows : undefined)
        const columns = field?.settings?.specific?.tableColumns || []
        const idKeyed = formRows.some((row) =>
          columns.some((col: { id?: string }) => col.id && col.id in row),
        )
        const normalizedFormRows =
          formRows.length > 0 && !idKeyed
            ? mapExternalRowsToTableColumns(formRows, columns)
            : formRows
        const sourceRows =
          normalizedFormRows.some(rowHasValues) || normalizedFormRows.length > 1
            ? normalizedFormRows
            : agentRows?.length
              ? mapExternalRowsToTableColumns(agentRows, columns)
              : normalizedFormRows
        return {
          agentRows,
          field,
          fieldId,
          heading,
          isLineItem: isLineItemHeading(heading),
          rows: sourceRows,
        }
      })
      .filter((entry) => {
        const columns = entry.field?.settings?.specific?.tableColumns || []
        if (!columns.length) return false
        return Boolean(entry.agentRows?.length) || entry.isLineItem
      })

    if (matched.length > 0) return matched

    const sourceRows = parseTableRows(
      formModel?.[fallbackHeading] ?? fallbackRows,
    )
    if (sourceRows.length === 0) return []

    const field = buildSyntheticTableField(fallbackHeading, sourceRows)
    return [
      {
        agentRows: fallbackRows,
        field,
        fieldId: fallbackHeading,
        heading: fallbackHeading,
        isLineItem: isLineItemHeading(fallbackHeading),
        rows: sourceRows,
      },
    ]
  }, [agentResult, fallbackHeading, fallbackRows, formModel, tableFields])

  useEffect(() => {
    if (!onFieldChange) return
    tables.forEach((table) => {
      if (!table.fieldId || seededFieldIds.current.has(table.fieldId)) return
      const current = parseTableRows(
        getFieldValueKeys(table.field).reduce<unknown>(
          (found, key) => found ?? formModel?.[key],
          undefined,
        ),
      )
      if (current.some(rowHasValues)) {
        seededFieldIds.current.add(table.fieldId)
        return
      }
      if (!table.agentRows?.length) return
      const columns = table.field?.settings?.specific?.tableColumns || []
      seededFieldIds.current.add(table.fieldId)
      onFieldChange(
        table.fieldId,
        mapExternalRowsToTableColumns(table.agentRows, columns),
      )
    })
  }, [formModel, onFieldChange, tables])

  if (tables.length === 0) return null

  return (
    <div className='flex flex-col gap-5'>
      {tables.map((table) => {
        const columns = table.field?.settings?.specific?.tableColumns || []
        const currentRows = draftRows[table.fieldId] ?? table.rows

        if (table.isLineItem) {
          const externalRows = normalizeLineItemRows(currentRows, columns)
          return (
            <QuoteLineItemsTable
              items={externalRows}
              key={table.fieldId}
              readOnly={readOnly}
              workflow={workflow}
              onFieldChange={onFieldChange}
            />
          )
        }

        return (
          <AgentFlatTable
            columns={columns}
            key={table.fieldId}
            readOnly={readOnly}
            rows={normalizeAgentTableRows(currentRows, columns)}
            title={table.heading}
            onChange={(rows) => {
              setDraftRows((prev) => ({ ...prev, [table.fieldId]: rows }))
              onFieldChange?.(table.fieldId, rows)
            }}
          />
        )
      })}
    </div>
  )
}

export const resolveFormFieldAmount = (
  workflow: any,
  formModel: Record<string, any> | undefined,
  labels: string[],
  fallback: unknown,
) => {
  if (!formModel) return fallback
  const fields = collectFormFields(workflow)
  for (const label of labels) {
    const want = normalizeHeading(label)
    const field = fields.find(
      (item) => normalizeHeading(getFieldHeading(item)) === want,
    )
    if (!field) continue
    for (const key of getFieldValueKeys(field)) {
      const value = formModel[key]
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        return value
      }
    }
  }
  return fallback
}

export default AgentEditableTables
