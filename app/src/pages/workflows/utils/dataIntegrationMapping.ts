import type {
  FieldMappingRequest,
  FieldMappingResponse,
} from '@/api/v6/fieldMapping'
import {
  isDecorativeFieldType,
  isMatrixFieldType,
  isTableType,
} from '@/pages/requests/utils/dynamicTable.utils'

export interface DataSyncSettings {
  enabled: boolean
  connectorId?: string
  /**
   * Workflow form field → master form field (stored by field id). Rows with
   * `IsMainField` identify the master record to update; there can be several.
   */
  fieldMappings?: FieldMappingRow[]
  masterFormId?: string
  target?: SyncTarget
}

/**
 * The shape written to the workflow JSON: ids plus the main-field flag. Also
 * drops keys older saves carried (name, labels, dataType, mainSyncFieldId)
 * the next time a block is edited.
 */
export const toStoredDataSync = (
  sync: DataSyncSettings & Record<string, unknown>,
): DataSyncSettings => {
  const target = sync.target || 'MASTER_FORM'
  const isMaster = target === 'MASTER_FORM'
  return {
    enabled: Boolean(sync.enabled),
    target,
    ...(isMaster
      ? {
          fieldMappings: (sync.fieldMappings || []).map((row) => ({
            IsMainField: Boolean(row?.IsMainField),
            masterFieldId: String(row?.masterFieldId || ''),
            workflowFieldId: String(row?.workflowFieldId || ''),
          })),
          masterFormId: String(sync.masterFormId || ''),
        }
      : { connectorId: String(sync.connectorId || '') }),
  }
}

/** Saved by field id only; labels come from the live form definitions. */
export type FieldMappingRow = {
  /** Matches the master record on this field (one or more rows). */
  IsMainField: boolean
  masterFieldId: string
  workflowFieldId: string
}

export type IntegrationField = {
  dataType: string
  id: string
  label: string
}

/**
 * Per-block "Data Integration" settings, saved on the node as `endSync`
 * (the key the END block already used) and exported to `block.settings`.
 */
export type SyncTarget = 'MASTER_FORM' | 'QUICKBOOKS' | 'SAP'

/** Data-entry controls of a form (no dividers, labels, tables or matrices). */
export const extractFormFields = (formJson: unknown): IntegrationField[] => {
  let form = formJson as any
  if (typeof form === 'string') {
    try {
      form = JSON.parse(form)
    } catch {
      return []
    }
  }
  if (form && typeof form === 'object' && 'formJson' in form) {
    return extractFormFields(form.formJson)
  }
  const panels = [
    ...(Array.isArray(form?.panels) ? form.panels : []),
    ...(Array.isArray(form?.secondaryPanels) ? form.secondaryPanels : []),
  ]
  const seen = new Set<string>()
  const fields: IntegrationField[] = []
  panels.forEach((panel: any) => {
    ;(panel?.fields || []).forEach((field: any) => {
      const type = String(field?.type || 'SHORT_TEXT').toUpperCase()
      if (
        !field?.id ||
        isDecorativeFieldType(type) ||
        isMatrixFieldType(type) ||
        isTableType(type)
      ) {
        return
      }
      const id = String(field.id)
      if (seen.has(id)) return
      seen.add(id)
      fields.push({
        dataType: type,
        id,
        label: String(field.label || field.name || id).trim(),
      })
    })
  })
  return fields
}

const typeFamily = (dataType?: string) => {
  const type = String(dataType || '').toUpperCase()
  if (
    ['NUMBER', 'CURRENCY', 'DECIMAL', 'COUNTER', 'CALCULATED'].includes(type)
  ) {
    return 'number'
  }
  if (['DATE', 'DATE_TIME', 'TIME'].includes(type)) return 'date'
  return 'text'
}

/** A text target accepts anything; number / date targets need the same kind. */
export const areTypesCompatible = (sourceType?: string, targetType?: string) =>
  typeFamily(targetType) === 'text' ||
  typeFamily(sourceType) === typeFamily(targetType)

const normalizeName = (value?: string) =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

/**
 * Payload for POST /field-mapping, in the contract onboarding uses: the
 * workflow form's labels are the source columns ("Fields" sheet), the master
 * form's fields are the targets.
 */
export const buildFieldMappingPayload = (
  workflowFields: IntegrationField[],
  masterFields: IntegrationField[],
): FieldMappingRequest => ({
  excelSheets: [
    {
      columns: Array.from(new Set(workflowFields.map((field) => field.label))),
      sheetName: 'Fields',
    },
  ],
  headerFields: masterFields.map((field) => ({
    dataType: field.dataType,
    name: field.label,
  })),
  lineItemFields: [],
})

/** Field with this exact (normalized) label, or null if none / ambiguous. */
const findUniqueByLabel = (fields: IntegrationField[], name?: string) => {
  const target = normalizeName(name)
  if (!target) return null
  const matches = fields.filter(
    (field) => normalizeName(field.label) === target,
  )
  return matches.length === 1 ? matches[0] : null
}

/**
 * Turns the API's name pairs into id-based rows. Only names that match
 * exactly one known field on each side are used; ambiguous or unknown names
 * are skipped so the user maps them by hand.
 */
export const resolveSuggestedMappings = (
  response: FieldMappingResponse | null | undefined,
  workflowFields: IntegrationField[],
  masterFields: IntegrationField[],
): FieldMappingRow[] => {
  const rows: FieldMappingRow[] = []
  const usedMaster = new Set<string>()
  const usedWorkflow = new Set<string>()
  // We only send header (target) fields, so only that group is read.
  const matches = Array.isArray(response?.headerFields)
    ? response.headerFields
    : []
  matches.forEach((match) => {
    const workflowField = findUniqueByLabel(workflowFields, match?.excelField)
    const masterField = findUniqueByLabel(masterFields, match?.masterField)
    if (!workflowField || !masterField) return
    if (usedMaster.has(masterField.id) || usedWorkflow.has(workflowField.id)) {
      return
    }
    usedMaster.add(masterField.id)
    usedWorkflow.add(workflowField.id)
    rows.push({
      IsMainField: false,
      masterFieldId: masterField.id,
      workflowFieldId: workflowField.id,
    })
  })
  return rows
}

/**
 * Adds suggestions without touching the user's rows: a suggestion is skipped
 * when its workflow field is already mapped or its master field is taken.
 */
export const mergeSuggestedMappings = (
  existing: FieldMappingRow[],
  suggested: FieldMappingRow[],
) => {
  const usedMaster = new Set(
    existing.map((row) => row.masterFieldId).filter(Boolean),
  )
  const usedWorkflow = new Set(
    existing.map((row) => row.workflowFieldId).filter(Boolean),
  )
  const added = suggested.filter(
    (row) =>
      !usedMaster.has(row.masterFieldId) &&
      !usedWorkflow.has(row.workflowFieldId),
  )
  return { added: added.length, rows: [...existing, ...added] }
}

/**
 * Rules checked on save (no field lists needed): required selections,
 * complete rows, at least one main field, no duplicate destination.
 * `labelOf` names master fields in messages when the form is loaded.
 */
export const validateDataSync = (
  sync?: DataSyncSettings | null,
  labelOf: (masterFieldId: string) => string | undefined = () => undefined,
): string[] => {
  if (!sync?.enabled) return []
  const target = sync.target || 'MASTER_FORM'
  if (target !== 'MASTER_FORM') {
    return sync.connectorId ? [] : ['Select a connection for Data Sync.']
  }
  const errors: string[] = []
  if (!sync.masterFormId) errors.push('Select a Master Form for Data Sync.')
  const rows = sync.fieldMappings || []
  if (!rows.some((row) => row.IsMainField)) {
    errors.push('Mark at least one mapping as the main field.')
  }
  if (rows.some((row) => !row.workflowFieldId || !row.masterFieldId)) {
    errors.push('Every field mapping row needs both fields selected.')
  }
  const name = (id: string) => {
    const label = labelOf(id)
    return label ? `"${label}"` : 'A master field'
  }
  const seen = new Set<string>()
  const reported = new Set<string>()
  rows.forEach((row) => {
    const id = row.masterFieldId
    if (!id || reported.has(id)) return
    if (seen.has(id)) {
      reported.add(id)
      errors.push(`${name(id)} is mapped more than once.`)
    }
    seen.add(id)
  })
  return errors
}
