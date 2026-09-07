// Shared helpers for turning a form-builder Question (see
// src/pages/form-builder/store/formStore.ts) into props for the app's
// existing @/components/base input components.

import dayjs from 'dayjs'
import {
  getFileNameWithoutExtension,
  isFilenameField,
  sortIndexingFields,
} from '@/pages/requests/utils/repoFolderMetadata'

export interface DateTimeLimits {
  maxDate?: string
  maxTime?: string
  minDate?: string
  minTime?: string
}

// Translates a DATE/TIME/DATE_TIME field's settings.validation
// (dateLimitType/timeLimitType + offsets or fixed bounds, configured in
// QuestionSettings.tsx's "Date Limits"/"Time Limits" sections) into the
// minDate/maxDate/minTime/maxTime props InputDate/InputTime/InputDateTime
// already know how to enforce. MIN_*/MAX_* offsets are years (date) or
// hours (time) from now; RANGE uses the fixed start/end values as-is.
export const getDateTimeLimits = (field: any): DateTimeLimits => {
  const validation = field?.settings?.validation || {}
  const limits: DateTimeLimits = {}

  switch (validation.dateLimitType) {
    case 'MIN_DATE':
      limits.minDate = dayjs()
        .add(validation.minDateOffset || 0, 'year')
        .format('YYYY-MM-DD')
      break
    case 'MAX_DATE':
      limits.maxDate = dayjs()
        .add(validation.maxDateOffset || 0, 'year')
        .format('YYYY-MM-DD')
      break
    case 'RANGE':
      if (validation.fixedStartDate) limits.minDate = validation.fixedStartDate
      if (validation.fixedEndDate) limits.maxDate = validation.fixedEndDate
      break
  }

  switch (validation.timeLimitType) {
    case 'MIN_TIME':
      limits.minTime = dayjs()
        .add(validation.minTimeOffset || 0, 'hour')
        .format('HH:mm')
      break
    case 'MAX_TIME':
      limits.maxTime = dayjs()
        .add(validation.maxTimeOffset || 0, 'hour')
        .format('HH:mm')
      break
    case 'RANGE':
      if (validation.fixedStartTime) limits.minTime = validation.fixedStartTime
      if (validation.fixedEndTime) limits.maxTime = validation.fixedEndTime
      break
  }

  return limits
}

// Seeds formModel with each DATE/TIME/DATE_TIME field's configured default
// value (specific.dateDefaultValueType/timeDefaultValueType, set in
// QuestionSettings.tsx's "Default Value Mode") when a new request form is
// first opened. Every other field type/mode is left unseeded, matching prior
// behavior (formModel started as {}).
export const buildInitialFormModel = (panels: any[]): Record<string, any> => {
  const model: Record<string, any> = {}

  for (const panel of panels || []) {
    for (const field of panel.fields || []) {
      const specific = field?.settings?.specific || {}

      if (field.type === 'DATE' || field.type === 'DATE_TIME') {
        if (specific.dateDefaultValueType === 'TODAY') {
          model[field.id] =
            field.type === 'DATE_TIME'
              ? dayjs().format('YYYY-MM-DD HH:mm')
              : dayjs().format('YYYY-MM-DD')
        } else if (
          specific.dateDefaultValueType === 'CUSTOM' &&
          specific.defaultValue
        ) {
          model[field.id] = String(specific.defaultValue).replace('T', ' ')
        }
      } else if (field.type === 'TIME') {
        if (specific.timeDefaultValueType === 'NOW') {
          model[field.id] = dayjs().format('HH:mm')
        } else if (
          specific.timeDefaultValueType === 'CUSTOM' &&
          specific.defaultValue
        ) {
          model[field.id] = specific.defaultValue
        }
      } else if (field.type === 'TABLE' || field.type === 'DYNAMIC_TABLE') {
        const rowsType = specific.rowsType || 'ON_DEMAND'
        const fixedRowCount = specific.fixedRowCount || 5
        if (rowsType === 'FIXED') {
          model[field.id] = Array.from({ length: fixedRowCount }, () => ({}))
        } else {
          model[field.id] = [{}]
        }
      }
    }
  }

  return model
}

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
  field?.type === 'CALCULATED' ||
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

  // CUSTOM or default options parsing
  const splitType = specific?.separateOptionsUsing
  const raw: string = specific?.customOptions || ''
  if (!raw.trim()) {
    if (field?.type === 'YES_NO_TOGGLE') {
      return [
        { id: 'Yes', name: 'Yes' },
        { id: 'No', name: 'No' },
      ]
    }
    return [
      { id: 'Option 1', name: 'Option 1' },
      { id: 'Option 2', name: 'Option 2' },
      { id: 'Option 3', name: 'Option 3' },
    ]
  }

  const parts = splitType === 'NEWLINE' ? raw.split('\n') : raw.split(',')
  return parts
    .map((opt: string) => opt.trim())
    .filter(Boolean)
    .map((opt: string) => ({ id: opt, name: opt }))
}

// Configured dropdown options only — skips the placeholder Option 1/2/3
// list used when a field has no customOptions yet.
export const getConfiguredFieldOptions = (field: any): FieldOption[] => {
  const specific = field?.settings?.specific
  if (specific?.optionsType === 'DYNAMIC') return getFieldOptions(field)
  const raw: string = specific?.customOptions || ''
  if (!String(raw).trim()) return []
  return getFieldOptions(field)
}

export const findFieldOption = (
  options: FieldOption[],
  value: unknown,
): FieldOption | null => {
  if (value === undefined || value === null || String(value).trim() === '') {
    return null
  }
  const raw = String(value)
  const lower = raw.toLowerCase()
  return (
    options.find(
      (opt) => String(opt.id) === raw || opt.name.toLowerCase() === lower,
    ) || { id: raw, name: raw }
  )
}

export const withExtraFieldOptions = (
  options: FieldOption[],
  extras: FieldOption[],
): FieldOption[] => {
  const next = [...options]
  for (const extra of extras) {
    const exists = next.some(
      (opt) =>
        String(opt.id) === String(extra.id) ||
        opt.name.toLowerCase() === extra.name.toLowerCase(),
    )
    if (!exists) next.push(extra)
  }
  return next
}

export const getDropdownFacetSource = (
  field: any,
  fallbackRepositoryId?: string,
): { enabled: boolean; fieldName: string; repositoryId: string } => {
  const isSelect =
    field?.type === 'SINGLE_SELECT' || field?.type === 'MULTI_SELECT'
  const specific = field?.settings?.specific || {}
  const optionsType = specific.optionsType || 'CUSTOM'
  const repositoryId = String(
    specific.repositoryId || fallbackRepositoryId || '',
  ).trim()
  const fieldName = String(
    optionsType === 'REPOSITORY'
      ? specific.repositoryField || ''
      : field?.label || '',
  ).trim()

  return {
    enabled:
      isSelect && optionsType !== 'DYNAMIC' && !!repositoryId && !!fieldName,
    fieldName,
    repositoryId,
  }
}

const scalarFromSelectItem = (item: unknown): string[] => {
  if (item == null || item === '') return []
  if (Array.isArray(item)) return item.flatMap(scalarFromSelectItem)
  if (typeof item === 'object') {
    const obj = item as { id?: unknown; name?: unknown; value?: unknown }
    const scalar = obj.id ?? obj.value ?? obj.name
    if (scalar == null || scalar === '' || typeof scalar === 'object') return []
    return [String(scalar)]
  }
  const text = String(item).trim()
  if (!text) return []
  if (text.startsWith('[') && text.endsWith(']')) {
    try {
      const parsed = JSON.parse(text)
      if (Array.isArray(parsed)) return parsed.flatMap(scalarFromSelectItem)
    } catch {
      // keep the original token
    }
  }
  return [text]
}

// Multi-select unique values are often stored as one array per row
// (JSON `["A","B"]`, comma/`|` joined, or a real array). Split those into
// individual option labels so the dropdown lists A and B, not the blob.
export const splitStoredSelectValues = (raw: unknown): string[] => {
  if (raw == null || raw === '') return []
  if (Array.isArray(raw)) return raw.flatMap(splitStoredSelectValues)
  if (typeof raw === 'object') return scalarFromSelectItem(raw)

  const text = String(raw).trim()
  if (!text) return []

  if (text.startsWith('[') && text.endsWith(']')) {
    try {
      const parsed = JSON.parse(text)
      if (Array.isArray(parsed)) return parsed.flatMap(splitStoredSelectValues)
    } catch {
      // not JSON — fall through to delimiter split
    }
  }

  if (text.includes('|')) {
    return text
      .split('|')
      .map((part) => part.trim())
      .filter(Boolean)
  }

  if (text.includes(',')) {
    return text
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
  }

  return [text]
}

// Resolve whatever the backend stored for a MULTI_SELECT field into the
// individual option ids/labels the control should show as selected.
// Arrays of primitives/objects stay as one token per item (so "Smith, John"
// is not split). JSON / comma / pipe strings from older rows are expanded.
export const normalizeStoredMultiSelectValue = (raw: unknown): string[] => {
  if (raw == null || raw === '') return []

  if (Array.isArray(raw) || typeof raw === 'object') {
    return scalarFromSelectItem(raw)
  }

  const text = String(raw).trim()
  if (!text) return []

  if (text.startsWith('[') && text.endsWith(']')) {
    try {
      const parsed = JSON.parse(text)
      if (Array.isArray(parsed)) return scalarFromSelectItem(parsed)
    } catch {
      // fall through to delimiter split
    }
  }

  if (text.includes('|')) {
    return text
      .split('|')
      .map((part) => part.trim())
      .filter(Boolean)
  }

  if (text.includes(',')) {
    return text
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
  }

  return [text]
}

export const facetsToFieldOptions = (
  facets: { value?: unknown }[] | undefined,
  options?: { splitArrayValues?: boolean },
): FieldOption[] => {
  const unique = new Set<string>()
  for (const facet of facets || []) {
    const parts = options?.splitArrayValues
      ? splitStoredSelectValues(facet?.value)
      : [String(facet?.value ?? '').trim()].filter(Boolean)
    for (const value of parts) unique.add(value)
  }
  return Array.from(unique).map((value) => ({ id: value, name: value }))
}

export const selectOptionStoredValue = (
  opt: { id?: string | number; name?: string; value?: string },
  knownOptions: FieldOption[],
): string => {
  const known = knownOptions.find((item) => String(item.id) === String(opt.id))
  if (known) return String(known.id)
  return String(opt.value || opt.name || opt.id)
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
  'CALCULATED',
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
  'TABLE',
  'DYNAMIC_TABLE',
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

const hintFieldName = (hint: string): string =>
  (hint.split(',')[0] || '').trim()

// Form labels and folder/OCR names must match case-insensitively. Strip
// asterisks and extra whitespace so "Customer *" still matches "Customer".
const normalizeName = (s: string) =>
  s
    .replace(/\*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

// FILE_UPLOAD "Auto-fill from Document" targets, same "Name,TYPE" shape as
// repository OCR hints so uploadForOcr can extract both in one pass.
export const buildFormFieldOcrHints = (
  panels: any[],
  assignedFieldIds: string[] | undefined,
): string[] => {
  if (!assignedFieldIds?.length) return []
  const idSet = new Set(assignedFieldIds.map(String))
  const hints: string[] = []
  for (const panel of panels || []) {
    for (const field of panel.fields || []) {
      if (!idSet.has(String(field.id)) || !field.label) continue
      hints.push(`${field.label},${field.type || 'SHORT_TEXT'}`)
    }
  }
  return hints
}

// Union of repository + auto-fill form hints. Same field name (case
// insensitive) is kept once — repository entry wins when both exist.
export const mergeOcrFieldHints = (
  ...hintLists: Array<string[] | undefined>
): string[] => {
  const byName = new Map<string, string>()
  for (const list of hintLists) {
    for (const hint of list || []) {
      const name = hintFieldName(hint)
      if (!name) continue
      const key = normalizeName(name)
      if (!byName.has(key)) byName.set(key, hint)
    }
  }
  return [...byName.values()]
}

export const buildMergedOcrFieldHints = (
  repoHints: string[] | undefined,
  panels: any[],
  uploadField: any,
): string[] =>
  mergeOcrFieldHints(
    repoHints,
    buildFormFieldOcrHints(
      panels,
      uploadField?.settings?.validation?.assignOtherControls,
    ),
  )

const ocrItemName = (raw?: string): string => {
  if (!raw) return ''
  const trimmed = raw.trim()
  const comma = trimmed.indexOf(',')
  if (comma <= 0) return trimmed
  return trimmed.slice(0, comma).trim()
}

// Finds the form field whose label matches a repository field's name (same
// convention the OCR mapping relies on: forms built off a repository use
// the repository's field names as their labels).
export const findFormFieldIdByName = (
  panels: any[],
  name: string,
): string | undefined => {
  const target = normalizeName(name)
  if (!target) return undefined
  for (const panel of panels || []) {
    for (const field of panel.fields || []) {
      const candidates = [field.label, field.name, field.title]
      if (!candidates.some((label) => label && normalizeName(label) === target)) {
        continue
      }
      return field.id || field.jsonId
    }
  }
  return undefined
}

export const findFormFieldById = (panels: any[], id: string): any =>
  (panels || [])
    .flatMap((panel: any) => panel.fields || [])
    .find((field: any) => field.id === id)

// Repository fields with no matching form field still need a slot in
// formModel (to render an input and to validate/submit them) — this prefix
// marks that slot as synthetic rather than a real form-builder field id, so
// buildStartWorkflowPayload knows to fold it back into `formData` by name
// instead of by (nonexistent) jsonId.
export const SYNTHETIC_FIELD_PREFIX = '__repo__'

export const syntheticFieldId = (name: string): string =>
  `${SYNTHETIC_FIELD_PREFIX}${name}`

export interface RepoFieldDescriptor {
  fieldId: string
  repoField: {
    dataType?: string
    isMandatory?: boolean
    level?: number
    name?: string
    sqlColumnName?: string
  }
  matchedFieldId?: string
  matchedFieldType?: string
}

// One entry per repository field, ALWAYS keyed by its own repo-native id
// (fieldId) — the repository, not the form, is what drives this list.
// matchedFieldId (the real form field sharing this repo field's name, if
// any) is kept only so callers can mirror values into it and hide it from
// the plain form renderer — see getRepoFieldValue below for how an
// already-filled form field's value carries over.
// Order matches folder indexing: mandatory first, then folder `level`.
export const buildRepoFieldDescriptors = (
  repositoryFields: {
    dataType?: string
    isMandatory?: boolean
    level?: number
    name?: string
    sqlColumnName?: string
  }[],
  panels: any[],
): RepoFieldDescriptor[] =>
  sortIndexingFields(
    (repositoryFields || []).filter((f) => f?.name && f.dataType !== 'TABLE'),
  ).map((repoField) => {
    const matchedFieldId = findFormFieldIdByName(panels, repoField.name!)
    return {
      fieldId: syntheticFieldId(repoField.name!),
      matchedFieldId,
      matchedFieldType: matchedFieldId
        ? findFormFieldById(panels, matchedFieldId)?.type
        : undefined,
      repoField,
    }
  })

// A repo field's current value: its own slot if set, else whatever the
// matching form field already holds (e.g. typed before any file was
// uploaded, back when the plain form was the only thing on screen).
export const getRepoFieldValue = (
  descriptor: Pick<RepoFieldDescriptor, 'fieldId' | 'matchedFieldId'>,
  formModel: Record<string, any>,
): any => {
  const own = formModel[descriptor.fieldId]
  if (!isValueEmpty(own)) return own
  return descriptor.matchedFieldId
    ? formModel[descriptor.matchedFieldId]
    : undefined
}

// Repo dataTypes whose FieldRenderer counterpart needs an options list
// (settings.specific.options/customOptions) that a repository field simply
// doesn't carry — e.g. DocumentType/ApprovalStatus are SINGLE_SELECT on the
// repository side, but rendering that as-is produces an empty, unusable
// dropdown. Render these as plain text input instead.
const NO_OPTIONS_DATA_TYPES = new Set([
  'SINGLE_SELECT',
  'SINGLE_CHOICE',
  'MULTI_SELECT',
  'MULTIPLE_CHOICE',
])

// Builds a minimal field object for a repository field, used to render it
// through FieldRenderer per the repository's OWN definition (type/mandatory)
// rather than whatever the form's own field config happens to say — the
// repository is the source of truth here, not the form.
export const buildSyntheticField = (repoField: {
  dataType?: string
  isMandatory?: boolean
  name?: string
}): any => {
  const dataType = repoField.dataType
  const type =
    SUPPORTED_TYPES.has(dataType || '') &&
    !NO_OPTIONS_DATA_TYPES.has(dataType || '')
      ? dataType
      : dataType === 'BOOLEAN'
        ? 'YES_NO_TOGGLE'
        : 'SHORT_TEXT'
  return {
    id: syntheticFieldId(repoField.name || ''),
    label: repoField.name,
    type,
    settings: {
      general: {},
      validation: {
        fieldRule: repoField.isMandatory ? 'REQUIRED' : 'OPTIONAL',
      },
    },
  }
}

const isValueEmpty = (value: any): boolean =>
  value === undefined ||
  value === null ||
  (typeof value === 'string' && value.trim() === '')

// Seeds empty Filename / File Name / Document Name repo fields from the
// uploaded file (extension stripped), same as folder indexing.
export const applyFilenamePreFillToFormModel = (
  formModel: Record<string, any>,
  descriptors: RepoFieldDescriptor[],
  fileName?: string,
): Record<string, any> => {
  const cleanFileName = getFileNameWithoutExtension(fileName || '')
  if (!cleanFileName) return formModel

  const next = { ...formModel }
  let changed = false
  for (const descriptor of descriptors) {
    if (
      !isFilenameField({
        name: descriptor.repoField.name || '',
        sqlColumnName: descriptor.repoField.sqlColumnName || '',
      })
    ) {
      continue
    }
    const current = String(getRepoFieldValue(descriptor, next) ?? '').trim()
    if (current === cleanFileName) continue
    next[descriptor.fieldId] = cleanFileName
    if (descriptor.matchedFieldId) {
      next[descriptor.matchedFieldId] = cleanFileName
    }
    changed = true
  }
  return changed ? next : formModel
}

const stringifyFieldValue = (value: any): string => {
  if (isValueEmpty(value)) return ''
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'object') return String(value.fileName || '')
  return String(value)
}

// Repository-mandatory fields that are still empty — covers both fields
// matched to a real form field and synthetic (form-less) ones alike, since
// descriptors already carry the resolved fieldId. The submit-blocking check.
export const getMissingMandatoryFields = (
  descriptors: RepoFieldDescriptor[],
  formModel: Record<string, any>,
): string[] =>
  descriptors
    .filter(
      (d) =>
        d.repoField.isMandatory &&
        isValueEmpty(getRepoFieldValue(d, formModel)),
    )
    .map((d) => d.repoField.name!)

// Same check as getMissingMandatoryFields, keyed by fieldId instead of
// repository field name — what the field-level `error` prop and the
// auto-stage trigger both key off.
export const getMissingMandatoryFieldIds = (
  descriptors: RepoFieldDescriptor[],
  formModel: Record<string, any>,
): Set<string> =>
  new Set(
    descriptors
      .filter(
        (d) =>
          d.repoField.isMandatory &&
          isValueEmpty(getRepoFieldValue(d, formModel)),
      )
      .map((d) => d.fieldId),
  )

// uploadForOcr's `ocrJson` is a stringified blob of shape
// `{ ocrResult: [...], ocrText: string, tokens: {...} }` — uploadWithOcr's
// own `ocrText` field wants just the plain-text piece out of it.
export const extractOcrText = (
  ocrJson: string | undefined,
): string | undefined => {
  if (!ocrJson) return undefined
  try {
    const parsed = JSON.parse(ocrJson)
    return typeof parsed?.ocrText === 'string' ? parsed.ocrText : undefined
  } catch {
    return undefined
  }
}

// Builds uploadWithOcr's `metadata` param: one entry per REPOSITORY field
// (not just the ones currently filled), keyed by the repository's own field
// name, valued from whatever the matching form field currently holds — the
// backend wants the full field set every time, empty string for anything
// not yet filled. "DocumentType" has no form counterpart on most forms, so
// it falls back to the uploaded file's extension (e.g. "Pdf") when empty.
export const buildRepoMetadata = (
  repositoryFields: {
    dataType?: string
    isMandatory?: boolean
    name?: string
  }[],
  panels: any[],
  formModel: Record<string, any>,
  fileName?: string,
): Record<string, string> => {
  const metadata: Record<string, string> = {}
  for (const descriptor of buildRepoFieldDescriptors(
    repositoryFields,
    panels,
  )) {
    const name = descriptor.repoField.name!
    const value = stringifyFieldValue(getRepoFieldValue(descriptor, formModel))

    if (!value && normalizeName(name) === 'documenttype' && fileName) {
      const ext = getFileExtension(fileName)
      metadata[name] = ext ? ext.charAt(0).toUpperCase() + ext.slice(1) : ''
    } else {
      metadata[name] = value
    }
  }
  return metadata
}

// Maps an uploadForOcr/uploadWithOcr response's `ocrFieldList` (matched by
// field NAME, e.g. "PO Number") into the formModel — always under the
// field's own repo-native id, AND mirrored onto the matching form field's id
// when one exists (same name), so both stay in sync regardless of which one
// downstream code reads. Every ocrFieldList name originates from a
// repo-field hint string (buildRepoFieldHints), so it's always a real
// repository field name.
export const mapOcrFieldsToModel = (
  panels: any[],
  ocrFieldList: { name?: string; value?: string }[] | undefined,
): Record<string, string> => {
  const patch: Record<string, string> = {}
  if (!Array.isArray(ocrFieldList) || ocrFieldList.length === 0) return patch

  for (const item of ocrFieldList) {
    const name = ocrItemName(item?.name)
    if (!name || !item.value) continue
    patch[syntheticFieldId(name)] = item.value
    const matchedFieldId = findFormFieldIdByName(panels, name)
    if (matchedFieldId) patch[matchedFieldId] = item.value
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
    return Boolean(value?.fileId || value?.itemId)
  }
  if (field.type === 'MULTI_SELECT') {
    return normalizeStoredMultiSelectValue(value).length > 0
  }
  if (field.type === 'MULTIPLE_CHOICE') {
    if (!Array.isArray(value) || value.length === 0) return false
    if (field.settings?.validation?.requiredValidation === 'ALL') {
      const opts = getFieldOptions(field)
      return opts.length > 0 && value.length >= opts.length
    }
    return true
  }
  if (field.type === 'YES_NO_TOGGLE' || field.type === 'CONSENT') {
    return value === true
  }
  if (field.type === 'TABLE' || field.type === 'DYNAMIC_TABLE') {
    return (
      Array.isArray(value) &&
      value.some((row) =>
        Object.entries(row).some(
          ([k, v]) =>
            !k.startsWith('_') &&
            v !== undefined &&
            v !== null &&
            String(v).trim() !== '',
        ),
      )
    )
  }
  return value !== undefined && value !== null && String(value).trim() !== ''
}
