// Shared helpers for turning a form-builder Question (see
// src/pages/form-builder/store/formStore.ts) into props for the app's
// existing @/components/base input components.

import dayjs from 'dayjs'
import formApi from '@/api/form/form'
import { evaluateFormRules } from '@/pages/form-builder/helpers/ruleEngine'

import {
  computeTableColumnTotals,
  ensureNormalizedRuntimeFormJson,
  evaluateTableRows,
  extractCurrencyCode,
  extractCurrencyNumericValue,
  extractPhoneInputString,
  formatRuntimeFieldDisplayValue,
  getEffectiveColumnLabel,
  getEffectiveFieldDescription,
  getEffectiveFieldLabel,
  getEffectiveFieldPlaceholder,
  getEffectiveFieldTooltip,
  getMatrixCellValue,
  getNormalizedMatrixConfig,
  hydrateFormModel,
  isFieldLabelHidden,
  isStructuredCurrencyValue,
  isStructuredPhoneValue,
  LEGACY_INLINE_FIELD_TYPES,
  resolveRuntimeFieldType,
  setMatrixCellValue,
  shouldShowTableSummaryRow,
  updateCurrencyFieldValue,
  updatePhoneFieldValue,
} from '@/pages/form-builder/helpers/runtimeFieldAdapter'
import {
  buildTableRowDefaults,
  hasMeaningfulTableRows,
} from '@/pages/form-builder/helpers/tableColumnDefaults'
import { getSessionTableUser } from '@/pages/form-builder/helpers/tableColumnUser'
import authUserStore from '@/stores/authUserStore'
import {
  getFileNameWithoutExtension,
  isFilenameField,
  sortIndexingFields,
} from '@/pages/requests/utils/repoFolderMetadata'

export {
  computeTableColumnTotals,
  ensureNormalizedRuntimeFormJson,
  evaluateTableRows,
  extractCurrencyCode,
  extractCurrencyNumericValue,
  extractPhoneInputString,
  formatRuntimeFieldDisplayValue,
  getEffectiveColumnLabel,
  getEffectiveFieldDescription,
  getEffectiveFieldLabel,
  getEffectiveFieldPlaceholder,
  getEffectiveFieldTooltip,
  getMatrixCellValue,
  getNormalizedMatrixConfig,
  hydrateFormModel,
  isFieldLabelHidden,
  isStructuredCurrencyValue,
  isStructuredPhoneValue,
  LEGACY_INLINE_FIELD_TYPES,
  resolveRuntimeFieldType,
  setMatrixCellValue,
  shouldShowTableSummaryRow,
  updateCurrencyFieldValue,
  updatePhoneFieldValue,
}

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

// Resolves a SHORT_TEXT field's "Fill value" strategy (settings.specific
// .fillValueType, set in QuestionSettings.tsx's Specific tab) into the
// literal string to seed the form model with. MASTER/ASSIGN_PARENT_FIELD/
// REQUEST_NO need live form or workflow context this helper doesn't have,
// so they're left unseeded here and handled where that context exists.
export const resolveShortTextFillValue = (field: any): string | undefined => {
  const specific = field?.settings?.specific || {}
  const type = specific.fillValueType || 'CUSTOM'
  const session = authUserStore.getState().session

  switch (type) {
    case 'CUSTOM':
      return specific.customDefaultValue || undefined
    case 'AUTO_GENERATE': {
      const prefix = specific.autoGenerateValue?.prefix || 'Form'
      const suffix = specific.autoGenerateValue?.suffix || 'DATE_TIME'
      const now = dayjs()
      const stamp =
        suffix === 'DATE'
          ? now.format('YYYYMMDD')
          : suffix === 'TIME'
            ? now.format('HHmmss')
            : now.format('YYYYMMDDHHmmss')
      return `${prefix}_${stamp}`
    }
    case 'USER_EMAIL':
      return session?.email || undefined
    case 'USER_NAME':
      return session?.firstName || session?.name?.split(' ')[0] || undefined
    case 'LOGIN_NAME':
      return session?.name || undefined
    case 'CURRENT_YEAR': {
      const now = dayjs()
      if (specific.yearType === 'FINANCIAL_YEAR') {
        return now.month() >= 3
          ? `${now.year()}-${now.year() + 1}`
          : `${now.year() - 1}-${now.year()}`
      }
      return String(now.year())
    }
    default:
      return undefined
  }
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
      const fieldType = resolveRuntimeFieldType(field)

      if (fieldType === 'DATE' || fieldType === 'DATE_TIME') {
        const isToday =
          specific.dateDefaultValueType === 'TODAY' ||
          specific.dateDefaultValueType === 'CURRENT_DATE' ||
          specific.defaultValueInSelectField === 'CURRENT_DATE' ||
          specific.defaultValueInSelectField === 'TODAY'
        if (isToday) {
          model[field.id] =
            fieldType === 'DATE_TIME'
              ? dayjs().format('YYYY-MM-DD HH:mm')
              : dayjs().format('YYYY-MM-DD')
        } else if (
          (specific.dateDefaultValueType === 'CUSTOM' || specific.defaultValue) &&
          specific.defaultValue
        ) {
          model[field.id] = String(specific.defaultValue).replace('T', ' ')
        }
      } else if (fieldType === 'TIME') {
        if (specific.timeDefaultValueType === 'NOW') {
          model[field.id] = dayjs().format('HH:mm')
        } else if (
          specific.timeDefaultValueType === 'CUSTOM' &&
          specific.defaultValue
        ) {
          model[field.id] = specific.defaultValue
        }
      } else if (
        fieldType === 'SINGLE_SELECT' ||
        fieldType === 'MULTI_SELECT' ||
        fieldType === 'SINGLE_CHOICE' ||
        fieldType === 'MULTIPLE_CHOICE'
      ) {
        const defaultMode = specific.defaultValueInSelectField
        if (defaultMode === 'USER_EMAIL') {
          const email = authUserStore.getState().session?.email
          if (email) {
            model[field.id] = email
          }
        } else if (defaultMode === 'USER_NAME') {
          const s = authUserStore.getState().session
          const name = s ? `${s.firstName || ''} ${s.lastName || ''}`.trim() : ''
          if (name) {
            model[field.id] = name
          }
        } else if (defaultMode === 'LOGIN_NAME') {
          const s = authUserStore.getState().session
          const loginName = s?.name || s?.email?.split('@')[0] || ''
          if (loginName) {
            model[field.id] = loginName
          }
        } else if (specific.customDefaultValue) {
          model[field.id] = specific.customDefaultValue
        } else if (
          specific.defaultValueInSelectField &&
          specific.defaultValueInSelectField !== 'USER_EMAIL' &&
          specific.defaultValueInSelectField !== 'USER_NAME' &&
          specific.defaultValueInSelectField !== 'LOGIN_NAME'
        ) {
          model[field.id] = specific.defaultValueInSelectField
        } else {
          const optionsType = String(specific.optionsType || 'CUSTOM').toUpperCase()
          if (optionsType === 'CUSTOM' || optionsType === 'DYNAMIC') {
            const opts = getFieldOptions(field)
            if (opts.length === 1) {
              const val = selectOptionStoredValue(opts[0], opts)
              model[field.id] =
                fieldType === 'MULTI_SELECT' || fieldType === 'MULTIPLE_CHOICE'
                  ? [val]
                  : val
            }
          }
        }
      } else if (fieldType === 'SHORT_TEXT' || fieldType === 'FULL_NAME') {
        const defaultMode = specific.defaultValueInSelectField
        if (defaultMode === 'USER_EMAIL') {
          const email = authUserStore.getState().session?.email
          if (email) {
            model[field.id] = email
          }
        } else if (defaultMode === 'USER_NAME') {
          const s = authUserStore.getState().session
          const name = s ? `${s.firstName || ''} ${s.lastName || ''}`.trim() : ''
          if (name) {
            model[field.id] = name
          }
        } else if (defaultMode === 'LOGIN_NAME') {
          const s = authUserStore.getState().session
          const loginName = s?.name || s?.email?.split('@')[0] || ''
          if (loginName) {
            model[field.id] = loginName
          }
        } else {
          const resolved = resolveShortTextFillValue(field)
          if (resolved) model[field.id] = resolved
        }
      } else if (fieldType === 'COUNTER' || fieldType === 'RATING') {
        model[field.id] = 0
      } else if (fieldType === 'TABLE' || fieldType === 'DYNAMIC_TABLE') {
        const rowsType = specific.rowsType || specific.tableRowsType || 'ON_DEMAND'
        const fixedRowCount =
          specific.fixedRowCount || specific.tableFixedRowCount || 5
        if (rowsType === 'FIXED') {
          const tableColumns: any[] = specific.tableColumns || []
          const labelCol = tableColumns.find((c: any) => c.type === 'LABEL')
          const fixedRowLabels: any[] = specific.tableFixedRowLabels || []

          const sessionUser = getSessionTableUser()
          const fixedRows: Array<Record<string, unknown>> = []
          for (let idx = 0; idx < fixedRowCount; idx += 1) {
            const rowObj: Record<string, any> = {}
            if (labelCol) {
              const labelEntry = fixedRowLabels[idx]
              if (typeof labelEntry === 'string') {
                rowObj[labelCol.id] = labelEntry
              } else if (labelEntry && typeof labelEntry === 'object') {
                rowObj[labelCol.id] = labelEntry[labelCol.id] ?? labelEntry.label ?? ''
              }
            }
            // Column defaults fill only cells the label seeding left empty
            Object.assign(
              rowObj,
              buildTableRowDefaults(
                tableColumns,
                fixedRows,
                sessionUser,
                rowObj,
              ),
            )
            fixedRows.push(rowObj)
          }
          model[field.id] = fixedRows
        } else {
          model[field.id] = [
            buildTableRowDefaults(
              specific.tableColumns || [],
              [],
              getSessionTableUser(),
            ),
          ]
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
  field?.settings?.validation?.fieldRule === 'REQUIRED' ||
  Boolean(
    field?.isRequired ||
    field?.required ||
    field?.isMandatory ||
    field?.settings?.validation?.required,
  )

export const isFieldHidden = (field: any): boolean =>
  Boolean(field?.settings?.general?.hidden) ||
  field?.settings?.general?.visibility === 'HIDDEN' ||
  field?.hidden === true

export const isFieldReadOnly = (field: any): boolean =>
  resolveRuntimeFieldType(field) === 'CALCULATED' ||
  Boolean(field?.settings?.general?.readOnly) ||
  Boolean(field?.settings?.specific?.isReadOnly) ||
  Boolean(field?.settings?.validation?.readonlySettings?.isReadOnly) ||
  Boolean(field?.settings?.validation?.readonlySettings?.state) ||
  field?.settings?.general?.visibility === 'READ_ONLY' ||
  field?.settings?.general?.visibility === 'DISABLE' ||
  field?.readOnly === true ||
  field?.disabled === true

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
    const rawType = String(field?.type || '').toUpperCase()
    if (rawType === 'YES_NO_TOGGLE' || rawType === 'YES_NO') {
      return [
        { id: 'Yes', name: 'Yes' },
        { id: 'No', name: 'No' },
      ]
    }
    if (rawType === 'LEGAL') {
      return [
        {
          id: 'I accept the Terms of Service',
          name: 'I accept the Terms of Service',
        },
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
  const optionsType = String(specific?.optionsType || 'CUSTOM').toUpperCase()
  const optionsSource = String(
    specific?.optionsSource || optionsType,
  ).toUpperCase()

  if (optionsType !== 'CUSTOM' || optionsSource !== 'CUSTOM') {
    if (optionsType === 'DYNAMIC') return getFieldOptions(field)
    return []
  }

  const raw: string = specific?.customOptions || ''
  if (!String(raw).trim()) return []
  return getFieldOptions(field)
}

export interface MasterFormInfo {
  enabled: boolean
  masterFormColumn: string
  masterFormId: string
  masterFormParentColumn?: string
  showAllData?: boolean
}

export const getMasterFormInfo = (field: any): MasterFormInfo => {
  const fieldType = resolveRuntimeFieldType(field)
  const isSelect =
    fieldType === 'SINGLE_SELECT' ||
    fieldType === 'MULTI_SELECT' ||
    fieldType === 'SINGLE_CHOICE' ||
    fieldType === 'MULTIPLE_CHOICE'

  const specific = field?.settings?.specific || {}
  const aiSettings = field?.settings?.aiSettings || {}
  const optionsType = String(specific.optionsType || '').toUpperCase()
  const optionsSource = String(
    specific.optionsSource || optionsType,
  ).toUpperCase()

  const isMaster =
    optionsType === 'MASTER' ||
    optionsType === 'MASTER_TABLE' ||
    optionsSource === 'MASTER' ||
    optionsSource === 'MASTER_TABLE'

  const masterFormId = String(
    specific.masterFormId ||
      aiSettings.formControlValidate?.masterFormId ||
      specific.masterFormDetails?.masterFormId ||
      '',
  ).trim()

  const rawCol =
    specific.masterFormColumn ||
    aiSettings.formControlValidate?.masterFormColumn ||
    specific.columnName ||
    specific.masterFormDetails?.masterFormColumn ||
    ''

  const masterFormColumn = Array.isArray(rawCol)
    ? String(rawCol[0] || '').trim()
    : String(rawCol).trim()

  const masterFormParentColumn = String(
    specific.masterFormParentColumn || '',
  ).trim()
  const showAllData = Boolean(specific.showAllData)

  return {
    enabled: isSelect && isMaster && !!masterFormId,
    masterFormColumn,
    masterFormId,
    masterFormParentColumn,
    showAllData,
  }
}

const normalizeDictList = (raw: any): any[] => {
  if (!raw) return []
  let item = raw
  if (typeof item === 'string') {
    const trimmed = item.trim()
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        item = JSON.parse(trimmed)
      } catch {
        return []
      }
    } else {
      return []
    }
  }
  if (!item || typeof item !== 'object') return []

  const result: any[] = []
  if (Array.isArray(item)) {
    result.push(item)
  } else {
    result.push(item)
    if (item.fields) result.push(...normalizeDictList(item.fields))
    if (item.values) result.push(...normalizeDictList(item.values))
    if (item.data) result.push(...normalizeDictList(item.data))
    if (item.formData) result.push(...normalizeDictList(item.formData))
  }
  return result
}

export const extractScalarStrings = (val: any): string[] => {
  if (val === undefined || val === null || val === '') return []
  if (typeof val === 'number' || typeof val === 'boolean') return [String(val)]
  if (typeof val === 'string') {
    const trimmed = val.trim()
    if (!trimmed) return []
    if (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      try {
        const parsed = JSON.parse(trimmed)
        return extractScalarStrings(parsed)
      } catch {
        // Fall back to plain string
      }
    }
    return [trimmed]
  }
  if (Array.isArray(val)) {
    return val.flatMap(extractScalarStrings)
  }
  if (typeof val === 'object') {
    const candidate = val.id ?? val.value ?? val.name ?? val.label
    if (candidate !== undefined && candidate !== null && candidate !== val) {
      return extractScalarStrings(candidate)
    }
  }
  return []
}

export const fetchMasterFormColumnOptions = async (
  masterFormId: string,
  masterFormColumn?: string,
  parentValue?: any,
  parentMasterColumn?: string,
  showAllData?: boolean,
  conditions?: Array<{ masterColumn: string; value: any }>,
): Promise<FieldOption[]> => {
  if (!masterFormId) return []

  try {
    let formFields: any[] = []
    let matchedField: any = undefined
    let columnKeyOrLabel = masterFormColumn || ''

    // 1. Fetch Form Definition for Master Form to extract column schema and configured customOptions
    const formDefRes = await formApi.getFormDataById(masterFormId)
    console.log('[fetchMasterFormColumnOptions] Master Form Def Response:', {
      masterFormId,
      masterFormColumn,
      formDefRes,
    })
    if (formDefRes.data) {
      let fJson = formDefRes.data.formJson || formDefRes.data._json
      if (typeof fJson === 'string') {
        try {
          fJson = JSON.parse(fJson)
        } catch {
          // ignore
        }
      }
      if (fJson?.panels) {
        formFields = fJson.panels.flatMap((p: any) => p.fields || [])
      }
    }

    if (!columnKeyOrLabel && formFields.length > 0) {
      columnKeyOrLabel = formFields[0].id || formFields[0].label || ''
    }

    const candidateKeys = new Set<string>()
    if (columnKeyOrLabel) {
      candidateKeys.add(columnKeyOrLabel)
      candidateKeys.add(columnKeyOrLabel.trim())
      candidateKeys.add(columnKeyOrLabel.trim().toLowerCase())
    }

    matchedField = formFields.find(
      (f: any) =>
        f.id === columnKeyOrLabel ||
        f.id?.trim() === columnKeyOrLabel?.trim() ||
        f.label?.trim().toLowerCase() ===
          columnKeyOrLabel?.trim().toLowerCase() ||
        f.name?.trim().toLowerCase() === columnKeyOrLabel?.trim().toLowerCase(),
    )

    if (matchedField) {
      if (matchedField.id) {
        candidateKeys.add(matchedField.id)
        candidateKeys.add(matchedField.id.trim())
        candidateKeys.add(matchedField.id.trim().toLowerCase())
      }
      if (matchedField.label) {
        candidateKeys.add(matchedField.label)
        candidateKeys.add(matchedField.label.trim())
        candidateKeys.add(matchedField.label.trim().toLowerCase())
      }
      if (matchedField.name) {
        candidateKeys.add(matchedField.name)
        candidateKeys.add(matchedField.name.trim())
        candidateKeys.add(matchedField.name.trim().toLowerCase())
      }
    }

    // Prepare parent column candidate keys if parent filtering is active
    const parentCandidateKeys = new Set<string>()
    if (parentMasterColumn) {
      parentCandidateKeys.add(parentMasterColumn)
      parentCandidateKeys.add(parentMasterColumn.trim())
      parentCandidateKeys.add(parentMasterColumn.trim().toLowerCase())
      const matchedParentField = formFields.find(
        (f: any) =>
          f.id === parentMasterColumn ||
          f.id?.trim() === parentMasterColumn?.trim() ||
          f.label?.trim().toLowerCase() ===
            parentMasterColumn?.trim().toLowerCase() ||
          f.name?.trim().toLowerCase() ===
            parentMasterColumn?.trim().toLowerCase(),
      )
      if (matchedParentField) {
        if (matchedParentField.id) {
          parentCandidateKeys.add(matchedParentField.id)
          parentCandidateKeys.add(matchedParentField.id.trim())
          parentCandidateKeys.add(matchedParentField.id.trim().toLowerCase())
        }
        if (matchedParentField.label) {
          parentCandidateKeys.add(matchedParentField.label)
          parentCandidateKeys.add(matchedParentField.label.trim())
          parentCandidateKeys.add(matchedParentField.label.trim().toLowerCase())
        }
        if (matchedParentField.name) {
          parentCandidateKeys.add(matchedParentField.name)
          parentCandidateKeys.add(matchedParentField.name.trim())
          parentCandidateKeys.add(matchedParentField.name.trim().toLowerCase())
        }
      }
    }

    // Explicit "Condition Mappings" (form field -> master column) take
    // precedence over the legacy single-parent cascade.
    const activeConditions = (conditions || [])
      .filter((c) => c.masterColumn)
      .map((c) => {
        const keys = new Set<string>()
        const addKeys = (s?: string) => {
          if (!s) return
          keys.add(s)
          keys.add(s.trim())
          keys.add(s.trim().toLowerCase())
        }
        addKeys(c.masterColumn)
        const f = formFields.find(
          (ff: any) =>
            ff.id === c.masterColumn ||
            ff.label?.trim().toLowerCase() ===
              c.masterColumn.trim().toLowerCase(),
        )
        addKeys(f?.id)
        addKeys(f?.label)
        addKeys(f?.name)
        return {
          keys,
          values: new Set(
            extractScalarStrings(c.value).map((s) => s.trim().toLowerCase()),
          ),
        }
      })
    const hasConditions = activeConditions.length > 0
    const conditionsToApply = activeConditions.filter((c) => c.values.size > 0)

    const hasParentFilter =
      !hasConditions &&
      Boolean(parentMasterColumn && String(parentMasterColumn).trim())
    const targetParentVals = extractScalarStrings(parentValue)
    const targetParentSet = new Set(
      targetParentVals.map((s) => s.trim().toLowerCase()),
    )

    if (hasParentFilter && targetParentSet.size === 0 && !showAllData) {
      return []
    }
    if (hasConditions && conditionsToApply.length === 0 && !showAllData) {
      return []
    }

    const uniqueValues = new Set<string>()

    // 2. Fetch Master Form Entries (GET first, fallback to POST search if needed)
    const entriesRes = await formApi.getFormEntries(masterFormId, 1, 500)
    console.log('[fetchMasterFormColumnOptions] 2. entriesRes (GET /entries):', entriesRes)
    let rawEntries: any[] = []
    const parseEntriesData = (data: any): any[] => {
      if (!data) return []
      if (Array.isArray(data)) return data
      if (Array.isArray(data.entries)) return data.entries
      if (Array.isArray(data.content)) return data.content
      if (Array.isArray(data.rows)) return data.rows
      if (Array.isArray(data.items)) return data.items
      if (Array.isArray(data.result)) return data.result
      if (Array.isArray(data.data)) {
        if (
          data.data.length > 0 &&
          data.data[0].value &&
          Array.isArray(data.data[0].value)
        ) {
          return data.data.flatMap((g: any) => g.value || [])
        }
        return data.data
      }
      return []
    }

    rawEntries = parseEntriesData(entriesRes.data)

    if (rawEntries.length === 0) {
      const searchRes = await formApi.searchFormEntries(masterFormId, {
        currentPage: 1,
        itemsPerPage: 500,
      })
      console.log('[fetchMasterFormColumnOptions] 2b. searchRes (POST /search):', searchRes)
      if (searchRes.data) {
        rawEntries = parseEntriesData(searchRes.data)
      }
    }

    console.log('[fetchMasterFormColumnOptions] rawEntries count:', rawEntries.length, rawEntries)

    const extractFromDict = (dictionary: any, keys: Set<string>): any => {
      if (!dictionary || typeof dictionary !== 'object') return undefined
      if (!Array.isArray(dictionary)) {
        for (const k of keys) {
          if (
            dictionary[k] !== undefined &&
            dictionary[k] !== null &&
            dictionary[k] !== ''
          ) {
            return dictionary[k]
          }
        }
        const entriesList = Object.entries(dictionary)
        for (const [k, v] of entriesList) {
          if (v !== undefined && v !== null && v !== '') {
            const kNorm = k.trim().toLowerCase()
            if (keys.has(kNorm) || keys.has(k)) {
              return v
            }
          }
        }
      } else {
        for (const item of dictionary) {
          if (item && typeof item === 'object') {
            const itemKey = String(
              item.id ||
                item.name ||
                item.label ||
                item.column ||
                item.key ||
                item.fieldName ||
                item.fieldId ||
                '',
            )
              .trim()
              .toLowerCase()
            if (keys.has(itemKey) && item.value != null && item.value !== '') {
              return item.value
            }
          }
        }
      }
      return undefined
    }

    for (const entry of rawEntries) {
      const dicts = [
        ...normalizeDictList(entry.formData),
        ...normalizeDictList(entry.values),
        ...normalizeDictList(entry.data),
        ...normalizeDictList(entry.fields),
        ...normalizeDictList(entry),
      ]

      if (conditionsToApply.length > 0) {
        const allMatch = conditionsToApply.every((cond) => {
          let entryVal: any = undefined
          for (const dict of dicts) {
            entryVal = extractFromDict(dict, cond.keys)
            if (entryVal !== undefined && entryVal !== null && entryVal !== '')
              break
          }
          return extractScalarStrings(entryVal).some((s) =>
            cond.values.has(s.trim().toLowerCase()),
          )
        })
        if (!allMatch) continue
      }

      if (hasParentFilter && targetParentSet.size > 0) {
        let entryParentVal: any = undefined
        for (const dict of dicts) {
          entryParentVal = extractFromDict(dict, parentCandidateKeys)
          if (
            entryParentVal !== undefined &&
            entryParentVal !== null &&
            entryParentVal !== ''
          ) {
            break
          }
        }

        if (
          entryParentVal === undefined ||
          entryParentVal === null ||
          entryParentVal === ''
        ) {
          continue
        }

        const entryParentStrings = extractScalarStrings(entryParentVal).map(
          (s) => s.trim().toLowerCase(),
        )
        const matchesParent = entryParentStrings.some((s) =>
          targetParentSet.has(s),
        )
        if (!matchesParent) {
          continue
        }
      }

      let val: any = undefined
      for (const dict of dicts) {
        val = extractFromDict(dict, candidateKeys)
        if (val !== undefined && val !== null && val !== '') break
      }

      if (val !== undefined && val !== null && val !== '') {
        const extractedStrings = extractScalarStrings(val)
        for (const rawStr of extractedStrings) {
          const splitVals = splitStoredSelectValues(rawStr)
          for (const item of splitVals) {
            const itemStr = item.trim()
            if (itemStr) uniqueValues.add(itemStr)
          }
        }
      }
    }

    const finalOptions = Array.from(uniqueValues).map((v) => ({ id: v, name: v }))
    console.log('[fetchMasterFormColumnOptions] Final extracted options:', finalOptions)
    return finalOptions
  } catch (err) {
    console.error('Error fetching master form column options:', err)
    return []
  }
}

// Powers a TABLE field's "Use values from a master table" sync
// (settings.specific.fillValueType === 'MASTER' + masterFormTableColumns,
// set in QuestionSettings.tsx's table-level Specific settings): fetches the
// master form's submitted records (same formApi.getFormEntries/
// searchFormEntries pattern as fetchMasterFormColumnOptions above, since
// there's no server-side filter param), keeps only the rows whose
// parentMasterColumnKey matches the current form's parent-field value, and
// maps each matching row into this TABLE's column-id-keyed row shape.
export const fetchMasterTableRows = async (
  masterFormId: string,
  parentMasterColumnKey: string | undefined,
  parentValue: any,
  columnMappings: Array<{ masterColumn: string; tableColumn: string }>,
): Promise<Record<string, any>[]> => {
  if (!masterFormId || columnMappings.length === 0) return []

  try {
    let formFields: any[] = []
    const formDefRes = await formApi.getFormDataById(masterFormId)
    if (formDefRes.data) {
      let fJson = formDefRes.data.formJson || formDefRes.data._json
      if (typeof fJson === 'string') {
        try {
          fJson = JSON.parse(fJson)
        } catch {
          // ignore
        }
      }
      if (fJson?.panels) {
        formFields = fJson.panels.flatMap((p: any) => p.fields || [])
      }
    }

    const buildCandidateKeys = (keyOrLabel: string): Set<string> => {
      const keys = new Set<string>()
      if (!keyOrLabel) return keys
      keys.add(keyOrLabel)
      keys.add(keyOrLabel.trim())
      keys.add(keyOrLabel.trim().toLowerCase())
      const matched = formFields.find(
        (f: any) =>
          f.id === keyOrLabel ||
          f.id?.trim() === keyOrLabel.trim() ||
          f.label?.trim().toLowerCase() === keyOrLabel.trim().toLowerCase() ||
          f.name?.trim().toLowerCase() === keyOrLabel.trim().toLowerCase(),
      )
      if (matched) {
        for (const v of [matched.id, matched.label, matched.name]) {
          if (v) {
            keys.add(v)
            keys.add(v.trim())
            keys.add(v.trim().toLowerCase())
          }
        }
      }
      return keys
    }

    const hasParentFilter = Boolean(parentMasterColumnKey)
    const parentCandidateKeys = buildCandidateKeys(parentMasterColumnKey || '')
    const targetParentSet = new Set(
      extractScalarStrings(parentValue).map((s) => s.trim().toLowerCase()),
    )
    if (hasParentFilter && targetParentSet.size === 0) return []

    const parseEntriesData = (data: any): any[] => {
      if (!data) return []
      if (Array.isArray(data)) return data
      if (Array.isArray(data.entries)) return data.entries
      if (Array.isArray(data.content)) return data.content
      if (Array.isArray(data.rows)) return data.rows
      if (Array.isArray(data.items)) return data.items
      if (Array.isArray(data.result)) return data.result
      if (Array.isArray(data.data)) {
        if (
          data.data.length > 0 &&
          data.data[0].value &&
          Array.isArray(data.data[0].value)
        ) {
          return data.data.flatMap((g: any) => g.value || [])
        }
        return data.data
      }
      return []
    }

    const entriesRes = await formApi.getFormEntries(masterFormId, 1, 500)
    let rawEntries = parseEntriesData(entriesRes.data)
    if (rawEntries.length === 0) {
      const searchRes = await formApi.searchFormEntries(masterFormId, {
        currentPage: 1,
        itemsPerPage: 500,
      })
      if (searchRes.data) rawEntries = parseEntriesData(searchRes.data)
    }

    const extractFromDict = (dictionary: any, keys: Set<string>): any => {
      if (!dictionary || typeof dictionary !== 'object') return undefined
      if (!Array.isArray(dictionary)) {
        for (const k of keys) {
          if (
            dictionary[k] !== undefined &&
            dictionary[k] !== null &&
            dictionary[k] !== ''
          ) {
            return dictionary[k]
          }
        }
        for (const [k, v] of Object.entries(dictionary)) {
          if (v !== undefined && v !== null && v !== '') {
            const kNorm = k.trim().toLowerCase()
            if (keys.has(kNorm) || keys.has(k)) return v
          }
        }
      } else {
        for (const item of dictionary) {
          if (item && typeof item === 'object') {
            const itemKey = String(
              item.id ||
                item.name ||
                item.label ||
                item.column ||
                item.key ||
                item.fieldName ||
                item.fieldId ||
                '',
            )
              .trim()
              .toLowerCase()
            if (keys.has(itemKey) && item.value != null && item.value !== '') {
              return item.value
            }
          }
        }
      }
      return undefined
    }

    const mappingKeySets = columnMappings
      .filter((m) => m.masterColumn && m.tableColumn)
      .map((m) => ({
        keys: buildCandidateKeys(m.masterColumn),
        tableColumn: m.tableColumn,
      }))

    const rows: Record<string, any>[] = []
    for (const entry of rawEntries) {
      const dicts = [
        ...normalizeDictList(entry.formData),
        ...normalizeDictList(entry.values),
        ...normalizeDictList(entry.data),
        ...normalizeDictList(entry.fields),
        ...normalizeDictList(entry),
      ]

      if (hasParentFilter) {
        let entryParentVal: any
        for (const dict of dicts) {
          entryParentVal = extractFromDict(dict, parentCandidateKeys)
          if (
            entryParentVal !== undefined &&
            entryParentVal !== null &&
            entryParentVal !== ''
          ) {
            break
          }
        }
        if (
          entryParentVal === undefined ||
          entryParentVal === null ||
          entryParentVal === ''
        ) {
          continue
        }
        const entryParentStrings = extractScalarStrings(entryParentVal).map(
          (s) => s.trim().toLowerCase(),
        )
        if (!entryParentStrings.some((s) => targetParentSet.has(s))) continue
      }

      const row: Record<string, any> = {}
      for (const { keys, tableColumn } of mappingKeySets) {
        let val: any
        for (const dict of dicts) {
          val = extractFromDict(dict, keys)
          if (val !== undefined && val !== null && val !== '') break
        }
        if (val !== undefined && val !== null && val !== '') {
          row[tableColumn] = Array.isArray(val) ? val.join(', ') : val
        }
      }
      if (Object.keys(row).length > 0) rows.push(row)
    }

    return rows
  } catch (err) {
    console.error('Error fetching master table rows:', err)
    return []
  }
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

export interface DropdownFacetSource {
  enabled: boolean
  fieldName: string
  repositoryId: string
  repositoryFieldParent?: string
}

export const getDropdownFacetSource = (
  field: any,
  fallbackRepositoryId?: string,
): DropdownFacetSource => {
  const fieldType = resolveRuntimeFieldType(field)
  const isSelect =
    fieldType === 'SINGLE_SELECT' ||
    fieldType === 'MULTI_SELECT' ||
    fieldType === 'SINGLE_CHOICE' ||
    fieldType === 'MULTIPLE_CHOICE'
  const specific = field?.settings?.specific || {}
  const optionsType = String(specific.optionsType || 'CUSTOM').toUpperCase()
  const optionsSource = String(
    specific.optionsSource || optionsType,
  ).toUpperCase()
  const isRepo = optionsType === 'REPOSITORY' || optionsSource === 'REPOSITORY'

  const repositoryId = String(
    specific.repositoryId || fallbackRepositoryId || '',
  ).trim()
  const fieldName = String(
    isRepo ? specific.repositoryField || '' : field?.label || '',
  ).trim()
  const repositoryFieldParent = String(
    specific.repositoryFieldParent || specific.masterFormParentColumn || '',
  ).trim()

  return {
    enabled:
      isSelect && optionsType !== 'DYNAMIC' && !!repositoryId && !!fieldName,
    fieldName,
    repositoryFieldParent,
    repositoryId,
  }
}

export const getDependentChildFieldIds = (
  parentFieldId: string,
  panelsOrFields: any[],
): string[] => {
  if (!parentFieldId || !panelsOrFields?.length) return []

  let allFields: any[] = []
  if (Array.isArray(panelsOrFields)) {
    if (panelsOrFields.length > 0) {
      if (panelsOrFields[0].fields && Array.isArray(panelsOrFields[0].fields)) {
        allFields = panelsOrFields.flatMap((p: any) => p.fields || [])
      } else {
        allFields = panelsOrFields
      }
    }
  }

  const parentField = allFields.find(
    (f: any) =>
      String(f.id) === String(parentFieldId) ||
      String(f.jsonId || '') === String(parentFieldId),
  )
  if (!parentField) return []

  const parentKeys = new Set<string>()
  if (parentField.id) {
    parentKeys.add(String(parentField.id))
    parentKeys.add(String(parentField.id).trim())
    parentKeys.add(String(parentField.id).trim().toLowerCase())
  }
  if (parentField.jsonId) {
    parentKeys.add(String(parentField.jsonId))
    parentKeys.add(String(parentField.jsonId).trim())
    parentKeys.add(String(parentField.jsonId).trim().toLowerCase())
  }
  if (parentField.label) {
    parentKeys.add(String(parentField.label))
    parentKeys.add(String(parentField.label).trim())
    parentKeys.add(String(parentField.label).trim().toLowerCase())
  }
  const parentMasterCol = parentField.settings?.specific?.masterFormColumn
  if (parentMasterCol) {
    const pMc = Array.isArray(parentMasterCol)
      ? String(parentMasterCol[0] || '').trim()
      : String(parentMasterCol).trim()
    if (pMc) {
      parentKeys.add(pMc)
      parentKeys.add(pMc.toLowerCase())
    }
  }
  const parentRepoField = parentField.settings?.specific?.repositoryField
  if (parentRepoField) {
    const pRf = String(parentRepoField).trim()
    if (pRf) {
      parentKeys.add(pRf)
      parentKeys.add(pRf.toLowerCase())
    }
  }

  const directChildIds: string[] = []

  for (const field of allFields) {
    const fieldId = String(field.id || field.jsonId || '')
    if (fieldId === String(parentFieldId)) continue

    const masterParent = String(
      field.settings?.specific?.masterFormParentColumn || '',
    ).trim()
    const repoParent = String(
      field.settings?.specific?.repositoryFieldParent || '',
    ).trim()
    const explicitParent = String(
      field.settings?.specific?.parentFieldId || '',
    ).trim()
    const currencyParent = String(
      field.settings?.specific?.currencyParentField || '',
    ).trim()
    const predefinedParent = String(
      field.settings?.specific?.predefinedParentColumn || '',
    ).trim()

    const matchesMasterParent =
      masterParent &&
      (parentKeys.has(masterParent) ||
        parentKeys.has(masterParent.toLowerCase()))
    const matchesRepoParent =
      repoParent &&
      (parentKeys.has(repoParent) || parentKeys.has(repoParent.toLowerCase()))
    const matchesExplicitParent =
      explicitParent &&
      (parentKeys.has(explicitParent) ||
        parentKeys.has(explicitParent.toLowerCase()))
    const matchesCurrencyParent =
      currencyParent &&
      (parentKeys.has(currencyParent) ||
        parentKeys.has(currencyParent.toLowerCase()))
    const matchesPredefinedParent =
      predefinedParent &&
      (parentKeys.has(predefinedParent) ||
        parentKeys.has(predefinedParent.toLowerCase()))

    if (
      matchesMasterParent ||
      matchesRepoParent ||
      matchesExplicitParent ||
      matchesCurrencyParent ||
      matchesPredefinedParent
    ) {
      if (fieldId) directChildIds.push(fieldId)
    }
  }

  const allDependentIds = new Set<string>(directChildIds)
  for (const childId of directChildIds) {
    const subChildren = getDependentChildFieldIds(childId, allFields)
    for (const subId of subChildren) {
      allDependentIds.add(subId)
    }
  }

  return Array.from(allDependentIds)
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
  s.replace(/\*/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase()

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
      if (
        !candidates.some((label) => label && normalizeName(label) === target)
      ) {
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

export const stringifyFieldValue = (value: any): string => {
  if (isValueEmpty(value)) return ''
  return formatRuntimeFieldDisplayValue(value)
}

export interface MissingMandatoryField {
  id: string
  label: string
}

// Evaluates non-readonly, non-hidden mandatory fields across repository fields and form panels.
export const getMissingMandatoryFieldsList = (
  descriptors: RepoFieldDescriptor[],
  panelsOrFormModel: any[] | Record<string, any>,
  formModelArg?: Record<string, any>,
  options?: { formRules?: any[]; hasUploadedFile?: boolean },
): MissingMandatoryField[] => {
  let panels: any[] = []
  let formModel: Record<string, any> = {}

  if (Array.isArray(panelsOrFormModel)) {
    panels = panelsOrFormModel
    formModel = formModelArg || {}
  } else {
    formModel = panelsOrFormModel || {}
  }

  const missing: MissingMandatoryField[] = []
  const processedIds = new Set<string>()
  const computedStates = evaluateFormRules(panels, formModel, options?.formRules)

  // 1. Process repository fields (unmatched repo fields are only required when indexing an uploaded file)
  for (const descriptor of descriptors || []) {
    if (!descriptor.repoField?.isMandatory) continue
    if (!descriptor.matchedFieldId && !options?.hasUploadedFile) continue

    let isReadOnly = false
    let isHidden = false
    let matchedField: any = null

    if (descriptor.matchedFieldId) {
      matchedField = findFormFieldById(panels, descriptor.matchedFieldId)
      if (matchedField) {
        const dynamicState = computedStates[matchedField.id]
        isReadOnly = dynamicState
          ? dynamicState.disabled
          : isFieldReadOnly(matchedField)
        isHidden = dynamicState
          ? !dynamicState.visible
          : isFieldHidden(matchedField)
      }
    }

    // Read-only or hidden mandatory fields must not block submission
    if (isReadOnly || isHidden) continue

    const value = getRepoFieldValue(descriptor, formModel)
    const filled = matchedField
      ? isFieldFilled(matchedField, value)
      : !isValueEmpty(value)

    if (!filled) {
      const label = descriptor.repoField.name || 'Required Field'
      missing.push({ id: descriptor.fieldId, label })
      processedIds.add(descriptor.fieldId)
      if (descriptor.matchedFieldId) {
        missing.push({ id: descriptor.matchedFieldId, label })
        processedIds.add(descriptor.matchedFieldId)
      }
    }
  }

  // 2. Process form panel fields
  for (const panel of panels || []) {
    if (panel?.id && computedStates[panel.id]?.visible === false) continue
    for (const field of panel.fields || []) {
      const fieldId = String(field.id || field.jsonId || '')
      if (!fieldId || processedIds.has(fieldId)) continue
      const fieldType = resolveRuntimeFieldType(field)
      if (PRESENTATIONAL_TYPES.has(fieldType)) continue

      const dynamicState = computedStates[field.id]
      const isHidden = dynamicState
        ? !dynamicState.visible
        : isFieldHidden(field)
      const isReadOnly = dynamicState
        ? dynamicState.disabled
        : isFieldReadOnly(field)

      if (isHidden || isReadOnly) continue

      const isReq = dynamicState ? dynamicState.required : isFieldRequired(field)
      if (isReq) {
        const val =
          formModel[field.id] ??
          (field.jsonId ? formModel[field.jsonId] : undefined)
        if (!isFieldFilled(field, val)) {
          const label = getEffectiveFieldLabel(field, 'Required Field')
          missing.push({ id: fieldId, label })
          processedIds.add(fieldId)
          if (field.id) processedIds.add(String(field.id))
          if (field.jsonId) processedIds.add(String(field.jsonId))
        }
      }
    }
  }

  return missing
}

// Repository and form-mandatory fields that are still empty (excluding read-only and hidden controls).
export const getMissingMandatoryFields = (
  descriptors: RepoFieldDescriptor[],
  panelsOrFormModel: any[] | Record<string, any>,
  formModelArg?: Record<string, any>,
  options?: { formRules?: any[]; hasUploadedFile?: boolean },
): string[] => {
  const list = getMissingMandatoryFieldsList(
    descriptors,
    panelsOrFormModel,
    formModelArg,
    options,
  )
  const labels = new Set<string>()
  for (const item of list) {
    labels.add(item.label)
  }
  return Array.from(labels)
}

// Same check as getMissingMandatoryFields, returning a Set of field IDs.
export const getMissingMandatoryFieldIds = (
  descriptors: RepoFieldDescriptor[],
  panelsOrFormModel: any[] | Record<string, any>,
  formModelArg?: Record<string, any>,
  options?: { formRules?: any[]; hasUploadedFile?: boolean },
): Set<string> => {
  const list = getMissingMandatoryFieldsList(
    descriptors,
    panelsOrFormModel,
    formModelArg,
    options,
  )
  const set = new Set<string>()
  for (const item of list) {
    set.add(item.id)
  }
  return set
}

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
  const fieldType = resolveRuntimeFieldType(field)
  if (PRESENTATIONAL_TYPES.has(fieldType)) return true

  if (fieldType === 'FILE_UPLOAD' || fieldType === 'IMAGE_UPLOAD') {
    return Boolean(value?.fileId || value?.itemId || value?.fileName)
  }
  if (fieldType === 'MULTI_SELECT') {
    return normalizeStoredMultiSelectValue(value).length > 0
  }
  if (fieldType === 'MULTIPLE_CHOICE') {
    const list = Array.isArray(value)
      ? value
      : typeof value === 'string' && value.trim()
        ? value
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : []
    if (list.length === 0) return false
    if (field.settings?.validation?.requiredValidation === 'ALL') {
      const opts = getFieldOptions(field)
      return opts.length > 0 && list.length >= opts.length
    }
    return true
  }
  if (fieldType === 'YES_NO_TOGGLE' || fieldType === 'CONSENT') {
    return value === true || value === 'Yes'
  }
  if (fieldType === 'TABLE' || fieldType === 'DYNAMIC_TABLE') {
    return hasMeaningfulTableRows(
      value,
      field?.settings?.specific?.tableColumns || [],
      getSessionTableUser(),
    )
  }
  if (fieldType === 'MATRIX') {
    if (!value || typeof value !== 'object') return false
    return Object.entries(value).some(
      ([k, v]) =>
        !k.startsWith('_') &&
        v !== undefined &&
        v !== null &&
        (Array.isArray(v) ? v.length > 0 : String(v).trim() !== ''),
    )
  }
  if (fieldType === 'CURRENCY_AMOUNT') {
    const numVal = extractCurrencyNumericValue(value)
    return numVal !== '' && numVal !== null && numVal !== undefined
  }
  if (fieldType === 'PHONE_NUMBER') {
    return extractPhoneInputString(value).trim() !== ''
  }
  return value !== undefined && value !== null && String(value).trim() !== ''
}
