import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import formApi from '@/api/form/form'
import workflowsApiV6 from '@/api/v6/workflows'
import { getFormPanels } from '@/pages/requests/components/columns/useDynamicColumns'
import { useRequestDetail } from '@/pages/requests/hooks/useRequestDetails'
import {
  isIgnorableField,
  isParentField,
  isTableType,
} from '@/pages/requests/utils/dynamicTable.utils'

export type TicketFormRow = {
  id: string
  label: string
  /** Table fields: rows keyed by column label (value is then ''). */
  table?: Array<Record<string, string>>
  value: string
}

type FormField = {
  id?: number | string
  jsonId?: number | string
  label?: string
  name?: string
  parentId?: number | string
  settings?: {
    specific?: {
      tableColumns?: Array<{
        id?: number | string
        label?: string
        name?: string
      }>
    }
  }
  type?: string
}

type JsonRecord = Record<string, unknown> & {
  fields?: Record<string, unknown>
  settings?: { general?: { initiateUsing?: { formId?: unknown } } }
}

/** Controls with no value of their own (sign-in steps, buttons, layout). */
const SKIPPED_TYPES = new Set([
  'EMAIL_AUTHENTICATION',
  'LOGIN_AUTHENTICATION',
  'MOBILE_AUTHENTICATION',
  'PASSWORD',
  'POPUP',
  'REDIRECT_TO_URL',
  'TABS',
  'TEXT_BUILDER',
])

const parseJson = (value: unknown): JsonRecord | null => {
  if (!value) return null
  if (typeof value === 'object') return value as JsonRecord
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch {
      return null
    }
  }
  return null
}

/** Field-id keyed values from a ticket's formData (string or object). */
const parseFormValues = (formData: unknown): Record<string, unknown> => {
  const parsed = parseJson(formData)
  const fields = parsed?.fields || parsed
  return fields && typeof fields === 'object' ? { ...fields } : {}
}

/** One display string for any stored value ('' when empty). */
const toText = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  if (Array.isArray(value)) {
    return value.map(toText).filter(Boolean).join(', ')
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    const named =
      record.label ??
      record.name ??
      record.fileName ??
      record.value ??
      record.text ??
      record.amount
    if (named !== undefined && named !== record) {
      const currency = record.currency ? `${String(record.currency)} ` : ''
      return `${currency}${toText(named)}`.trim()
    }
    return ''
  }
  return String(value).trim()
}

/**
 * A table field's saved rows, keyed by its column labels (columns are the
 * fields whose parentId is the table). Without column fields, the stored
 * keys are used as they are.
 */
const toTableRows = (
  raw: unknown,
  fields: FormField[],
  table: FormField,
): Array<Record<string, string>> => {
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { data?: unknown })?.data)
      ? (raw as { data: unknown[] }).data
      : []
  // Columns are configured on the table itself (settings.specific
  // .tableColumns, as the table renderer reads them); older forms keep them
  // as fields whose parentId is the table.
  const configured = (table.settings?.specific?.tableColumns || []).filter(
    (column) => column?.id !== undefined && column?.id !== null,
  )
  const columns: FormField[] = configured.length
    ? configured.map((column) => ({
        id: column.id,
        label: column.name || column.label,
      }))
    : fields.filter(
        (field) =>
          field?.parentId !== undefined &&
          field?.parentId !== null &&
          String(field.parentId) === String(table.id) &&
          !isIgnorableField(field),
      )
  return list.map((row) => {
    const record =
      row && typeof row === 'object' ? (row as Record<string, unknown>) : {}
    if (!columns.length) {
      return Object.fromEntries(
        Object.entries(record).map(([key, value]) => [key, toText(value)]),
      )
    }
    return Object.fromEntries(
      columns.map((column) => [
        String(column.label || column.name || column.id),
        toText(
          record[String(column.id)] ??
            record[String(column.jsonId)] ??
            record[String(column.label)],
        ),
      ]),
    )
  })
}

/**
 * The workflow form behind a document's ticket as label / value rows (no
 * panels): the workflow's form (GET /workflows/{id} + its form) with the
 * request's saved values. Every value control is listed, including empty
 * ones; tables show their row count.
 */
export const useTicketFormRows = (
  workflowId: string | undefined,
  instanceId: string | undefined,
  enabled: boolean,
) => {
  const workflowQuery = useQuery({
    enabled: Boolean(enabled && workflowId),
    queryKey: ['ticket-form-workflow', workflowId],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const res = await workflowsApiV6.getWorkflowById(String(workflowId))
      if (!res?.data) {
        throw new Error(String(res?.error || 'Workflow not found'))
      }
      const wf = res.data as JsonRecord & {
        formId?: unknown
        formJson?: unknown
        wFormId?: unknown
      }
      const wfJson = parseJson(wf.workflowJson)
      const flowJson = parseJson(wf.flowJson)
      const formId =
        wf.formId ??
        wf.wFormId ??
        wf.settings?.general?.initiateUsing?.formId ??
        wfJson?.settings?.general?.initiateUsing?.formId ??
        flowJson?.settings?.general?.initiateUsing?.formId ??
        ''
      let formJson = wf.formJson
      if (formId) {
        const formRes = await formApi.getFormDataById(String(formId))
        if (formRes?.data) {
          formJson = formRes.data._json ?? formRes.data.formJson ?? formRes.data
        }
      }
      return { ...wf, formJson: parseJson(formJson) ?? formJson }
    },
  })

  const requestQuery = useRequestDetail(
    enabled && workflowId ? workflowId : null,
    enabled && instanceId ? instanceId : null,
    null,
  )

  const rows = useMemo<TicketFormRow[]>(() => {
    if (!workflowQuery.data) return []
    const values = parseFormValues(requestQuery.data?.formData)
    const fields = getFormPanels(workflowQuery.data).flatMap(
      (panel: { fields?: FormField[] }) => panel?.fields || [],
    ) as FormField[]
    const seen = new Set<string>()
    return fields
      .filter(
        (field) =>
          field?.id !== undefined &&
          !isIgnorableField(field) &&
          // Table columns are covered by their table's row count.
          isParentField(field) &&
          !SKIPPED_TYPES.has(String(field.type || '').toUpperCase()),
      )
      .filter((field) => {
        const id = String(field.id)
        if (seen.has(id)) return false
        seen.add(id)
        return true
      })
      .map((field) => {
        const raw = values[String(field.id)] ?? values[String(field.jsonId)]
        const label = String(field.label || field.name || field.id)
        if (isTableType(field.type)) {
          return {
            id: String(field.id),
            label,
            // Opened in the table popup; no single value to find in the PDF.
            table: toTableRows(raw, fields, field),
            value: '',
          }
        }
        return { id: String(field.id), label, value: toText(raw) }
      })
  }, [requestQuery.data?.formData, workflowQuery.data])

  return {
    isError: workflowQuery.isError || requestQuery.isError,
    isLoading: enabled && (workflowQuery.isLoading || requestQuery.isLoading),
    rows,
    retry: () => {
      if (workflowQuery.isError) void workflowQuery.refetch()
      if (requestQuery.isError) void requestQuery.refetch()
    },
  }
}
