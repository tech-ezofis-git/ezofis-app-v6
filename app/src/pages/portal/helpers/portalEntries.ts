import type { Option } from '@/types/option'
import formApi from '@/api/form/form'

export type PortalEntrySearchResult = {
  entries: Record<string, unknown>[]
  error: string
  fields: PortalFormField[]
  formJson?: unknown
}

export type PortalFormField = Option

const SYSTEM_ENTRY_KEYS = new Set([
  'ValidFrom',
  'ValidTo',
  'createdAt',
  'createdBy',
  'formId',
  'formJson',
  'isDeleted',
  'isMarked',
  'itemId',
  'modifiedAt',
  'modifiedBy',
  'todayTask',
])

export const extractPortalFormFields = (
  formJson: unknown,
): PortalFormField[] => {
  let parsed = formJson
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed)
    } catch {
      return []
    }
  }
  if (!parsed || typeof parsed !== 'object') return []
  const record = parsed as Record<string, unknown>
  const rawFields = Array.isArray(record.panels)
    ? record.panels.flatMap((panel) => {
        const row = panel as Record<string, unknown>
        return Array.isArray(row.fields) ? row.fields : []
      })
    : Array.isArray(record.fields)
      ? record.fields
      : []

  return rawFields
    .map((field): PortalFormField | null => {
      const row = field as Record<string, unknown>
      const id = String(row.id || row.key || row.name || '')
      const name = String(row.label || row.title || row.name || row.id || '')
      return id ? { id, name: name || id } : null
    })
    .filter((field): field is PortalFormField => Boolean(field))
}

const asEntries = (data: unknown): Record<string, unknown>[] => {
  if (!data || typeof data !== 'object') return []
  const record = data as Record<string, unknown>
  if (Array.isArray(record.entries)) {
    return record.entries as Record<string, unknown>[]
  }
  if (Array.isArray(data)) return data as Record<string, unknown>[]
  return []
}

const asFormJson = (data: unknown) => {
  if (!data || typeof data !== 'object') return undefined
  const record = data as Record<string, unknown>
  return record.formJson || record.form || undefined
}

export const searchPortalEntries = async ({
  fieldId,
  formId,
  tenantId,
  value,
}: {
  fieldId: string
  formId: string
  tenantId?: string
  value: string
}): Promise<PortalEntrySearchResult> => {
  const payload = {
    currentPage: 0,
    filterBy: [
      {
        filters: [
          {
            condition: 'eq',
            criteria: fieldId,
            value,
          },
        ],
        groupCondition: '',
      },
    ],
    includeFormJson: true,
    itemsPerPage: 0,
    mode: 'live',
    sortBy: {
      criteria: '',
      order: '',
    },
  }

  const { data, error } = await formApi.searchFormEntries(
    formId,
    payload,
    tenantId,
  )

  if (error) {
    return { entries: [], error, fields: [] }
  }

  const formJson = asFormJson(data)
  return {
    entries: asEntries(data),
    error: '',
    fields: extractPortalFormFields(formJson),
    formJson,
  }
}

export const listPortalEntries = async ({
  formId,
  tenantId,
}: {
  formId: string
  tenantId?: string
}): Promise<PortalEntrySearchResult> => {
  const payload = {
    currentPage: 0,
    filterBy: [],
    includeFormJson: true,
    itemsPerPage: 0,
    mode: 'live',
    sortBy: {
      criteria: 'createdAt',
      order: 'DESC',
    },
  }

  const { data, error } = await formApi.searchFormEntries(
    formId,
    payload,
    tenantId,
  )

  if (error) {
    const fallback = await formApi.getFormEntries(
      formId,
      1,
      200,
      true,
      tenantId,
    )
    if (fallback.error) {
      return { entries: [], error: fallback.error, fields: [] }
    }
    const formJson = asFormJson(fallback.data)
    return {
      entries: asEntries(fallback.data),
      error: '',
      fields: extractPortalFormFields(formJson),
      formJson,
    }
  }

  const formJson = asFormJson(data)
  return {
    entries: asEntries(data),
    error: '',
    fields: extractPortalFormFields(formJson),
    formJson,
  }
}

export const entryFieldValue = (
  entry: Record<string, unknown> | undefined,
  fieldId?: string | number,
) => {
  if (!entry || fieldId == null || fieldId === '') return ''
  const value = entry[String(fieldId)]
  if (value == null) return ''
  return String(value)
}

export const visibleEntryFields = (
  fields: PortalFormField[],
  entries: Record<string, unknown>[],
) => {
  if (fields.length) {
    return fields.filter((field) => !SYSTEM_ENTRY_KEYS.has(String(field.id)))
  }

  const keys = new Set<string>()
  entries.forEach((entry) => {
    Object.keys(entry).forEach((key) => {
      if (!SYSTEM_ENTRY_KEYS.has(key)) keys.add(key)
    })
  })
  return Array.from(keys).map((id) => ({ id, name: id }))
}

export const formatEntryDisplay = (value: unknown) => {
  if (value == null || value === '') return '—'
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }
  return String(value)
}
