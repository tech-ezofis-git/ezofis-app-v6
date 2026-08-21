// Shared helpers for turning a form-builder Question (see
// src/pages/form-builder/store/formStore.ts) into props for the app's
// existing @/components/base input components.

export const getColumnSizeClass = (size?: string): string => {
  switch (size) {
    case 'col-3':
      return 'w-full sm:w-1/4'
    case 'col-4':
      return 'w-full sm:w-1/3'
    case 'col-6':
      return 'w-full sm:w-1/2'
    case 'col-12':
      return 'w-full'
    default:
      return 'w-full sm:w-1/2'
  }
}

export const isFieldRequired = (field: any): boolean =>
  field?.settings?.validation?.fieldRule === 'REQUIRED'

export const isFieldHidden = (field: any): boolean =>
  Boolean(field?.settings?.general?.hidden) ||
  field?.settings?.general?.visibility === 'HIDDEN'

export const isFieldReadOnly = (field: any): boolean =>
  Boolean(field?.settings?.general?.readOnly) ||
  field?.settings?.general?.visibility === 'READ_ONLY'

export interface FieldOption {
  id: string
  name: string
}

// Mirrors the CUSTOM/DYNAMIC options logic already used in
// src/pages/requests/components/request/components/sections/form/Form.tsx.
export const getFieldOptions = (field: any): FieldOption[] => {
  const specific = field?.settings?.specific
  const optionsType = specific?.optionsType

  if (optionsType === 'CUSTOM') {
    const splitType = specific?.separateOptionsUsing
    const raw: string = specific?.customOptions || ''
    if (!raw.trim()) return []
    const parts = splitType === 'NEWLINE' ? raw.split('\n') : raw.split(',')
    return parts
      .map((opt: string) => opt.trim())
      .filter(Boolean)
      .map((opt: string) => ({ id: opt, name: opt }))
  }

  if (optionsType === 'DYNAMIC') {
    const options = specific?.options || []
    return options.map((opt: any) =>
      typeof opt === 'string'
        ? { id: opt, name: opt }
        : {
            id: String(opt.id ?? opt.value ?? opt.name),
            name: String(opt.name ?? opt.label ?? opt.value),
          },
    )
  }

  return []
}

// Every field the panels/fields loop should skip rendering an input for
// (purely presentational blocks).
export const PRESENTATIONAL_TYPES = new Set(['HEADING', 'LABEL', 'DIVIDER'])

// Field types this MVP renderer knows how to map to an existing base input.
// Anything outside this set falls back to a "not yet supported" placeholder
// rather than silently dropping the field.
export const SUPPORTED_TYPES = new Set([
  'SHORT_TEXT',
  'EMAIL',
  'URL',
  'PHONE_NUMBER',
  'FULL_NAME',
  'PASSWORD',
  'LONG_TEXT',
  'TEXT_BUILDER',
  'NUMBER',
  'CURRENCY_AMOUNT',
  'COUNTER',
  'DATE',
  'TIME',
  'DATE_TIME',
  'SINGLE_SELECT',
  'SINGLE_CHOICE',
  'MULTI_SELECT',
  'MULTIPLE_CHOICE',
  'FILE_UPLOAD',
  'IMAGE_UPLOAD',
  'YES_NO_TOGGLE',
  'CONSENT',
  'HEADING',
  'LABEL',
  'DIVIDER',
])

export const getFileExtension = (fileName: string): string => {
  const parts = (fileName || '').split('.')
  return parts.length > 1 ? (parts.pop() || '').toLowerCase() : ''
}

// OCR hints for uploadAndIndex.uploadForOcr/uploadWithOcr's `fields` param —
// "Name,TYPE" per the integration guide's format. Built from the
// REPOSITORY's own field definitions (not the form's), since the
// repository is the source of truth for what's mandatory — the form's
// fields don't carry that flag.
export const buildRepoFieldHints = (
  repositoryFields: { dataType?: string; name?: string }[],
): string[] =>
  (repositoryFields || [])
    .filter((f) => f?.name)
    .map((f) => `${f.name},${f.dataType || 'SHORT_TEXT'}`)

const normalizeName = (s: string) => s.trim().toLowerCase()

// Finds the form field whose label matches a repository field's name (same
// convention the OCR mapping relies on: forms built off a repository use
// the repository's field names as their labels).
export const findFormFieldIdByName = (
  panels: any[],
  name: string,
): string | undefined => {
  const target = normalizeName(name)
  for (const panel of panels || []) {
    for (const field of panel.fields || []) {
      if (field.label && normalizeName(field.label) === target) return field.id
    }
  }
  return undefined
}

// Repository-mandatory fields that either aren't on this form at all, or
// are on the form but still empty — the submit-blocking check.
export const getMissingMandatoryFields = (
  panels: any[],
  formModel: Record<string, any>,
  mandatoryFieldNames: string[],
): string[] => {
  const missing: string[] = []
  for (const name of mandatoryFieldNames) {
    const fieldId = findFormFieldIdByName(panels, name)
    if (!fieldId) continue // not represented on this form — can't validate
    const value = formModel[fieldId]
    const isEmpty =
      value === undefined ||
      value === null ||
      (typeof value === 'string' && value.trim() === '')
    if (isEmpty) missing.push(name)
  }
  return missing
}

// Maps an uploadForOcr/uploadWithOcr response's `ocrFieldList` (matched by
// field NAME,
// e.g. "PO Number") back onto this form's fields (matched by label) so the
// extracted values can be written into the formModel by field id.
export const mapOcrFieldsToModel = (
  panels: any[],
  ocrFieldList: { name?: string; value?: string }[] | undefined,
): Record<string, string> => {
  const patch: Record<string, string> = {}
  if (!Array.isArray(ocrFieldList) || ocrFieldList.length === 0) return patch

  for (const item of ocrFieldList) {
    if (!item?.name || !item.value) continue
    const fieldId = findFormFieldIdByName(panels, item.name)
    if (fieldId) patch[fieldId] = item.value
  }

  return patch
}

export const formatFileSize = (bytes?: number): string => {
  if (!bytes || Number.isNaN(bytes)) return ''
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

// Whether a required field currently has a value worth counting toward a
// panel's "N of M mandatory fields completed" indicator.
export const isFieldFilled = (field: any, value: any): boolean => {
  if (PRESENTATIONAL_TYPES.has(field.type)) return true

  if (field.type === 'FILE_UPLOAD' || field.type === 'IMAGE_UPLOAD') {
    return Boolean(value?.fileId)
  }
  if (field.type === 'MULTI_SELECT' || field.type === 'MULTIPLE_CHOICE') {
    return Array.isArray(value) && value.length > 0
  }
  if (field.type === 'YES_NO_TOGGLE' || field.type === 'CONSENT') {
    return value === true
  }
  return value !== undefined && value !== null && String(value).trim() !== ''
}
