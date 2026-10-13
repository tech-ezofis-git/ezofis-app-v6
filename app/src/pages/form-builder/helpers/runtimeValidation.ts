/* eslint-disable @typescript-eslint/no-explicit-any */
import dayjs from 'dayjs'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import {
  extractCurrencyCode,
  extractCurrencyNumericValue,
  extractPhoneInputString,
  getEffectiveColumnLabel,
  getEffectiveFieldLabel,
  getNormalizedMatrixConfig,
  isFieldHidden,
  isFieldLabelHidden,
  isFieldReadOnly,
  isFieldRequired,
  isStructuredCurrencyValue,
  isStructuredPhoneValue,
  resolveRuntimeFieldType,
} from './runtimeFieldAdapter'
import { evaluateFormRules } from './ruleEngine'

dayjs.extend(isSameOrAfter)
dayjs.extend(isSameOrBefore)

export const EMAIL_REGEX =
  /^(?!\.)((?!.*\.{2})[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+)@(?!\.)([a-zA-Z0-9-]+)((\.([a-zA-Z0-9-]){2,63})+)$/i

export const URL_REGEX =
  /^(https?:\/\/)?((([a-z\d]([a-z\d-]*[a-z\d])*)\.?)+[a-z]{2,}|((\d{1,3}\.){3}\d{1,3}))(:\d+)?(\/[-a-z\d%_.~+]*)*(\?[;&a-z\d%_.~+=-]*)?(#[-a-z\d_]*)?$/i

export const ALPHA_REGEX = /^[a-zA-Z\s]*$/
export const ALPHANUMERIC_REGEX = /^[a-zA-Z0-9\s]*$/
export const NUMERIC_REGEX = /^-?\d+(\.\d+)?$/
export const INTEGER_REGEX = /^-?\d+$/

export interface FieldValidationResult {
  error?: string
  errors: string[]
  isValid: boolean
}

export interface FormValidationResult {
  errors: Record<string, string> // fieldId -> first error message
  fieldErrors: Record<string, string[]> // fieldId -> all error messages
  isValid: boolean
  missingFields: Array<{ id: string; label: string }>
}

/**
 * Checks whether a runtime value is considered empty for validation purposes.
 */
export function isRuntimeValueEmpty(value: any, field?: any): boolean {
  if (value === undefined || value === null) return true

  const runtimeType = field ? resolveRuntimeFieldType(field) : ''

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed === '' || trimmed === '<p></p>') return true
    return false
  }

  if (typeof value === 'number') {
    return Number.isNaN(value)
  }

  if (typeof value === 'boolean') {
    return false
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return true
    if (runtimeType === 'TABLE' || runtimeType === 'DYNAMIC_TABLE') {
      return !value.some((row) =>
        Object.entries(row || {}).some(
          ([k, v]) =>
            !k.startsWith('_') &&
            v !== undefined &&
            v !== null &&
            String(v).trim() !== '',
        ),
      )
    }
    return false
  }

  if (typeof value === 'object') {
    if (runtimeType === 'CURRENCY_AMOUNT' || isStructuredCurrencyValue(value)) {
      const code = String(value.currency ?? '').trim()
      const val = value.value
      return !code || val === undefined || val === null || String(val).trim() === ''
    }

    if (runtimeType === 'PHONE_NUMBER' || isStructuredPhoneValue(value)) {
      const phoneNo = String(value.phoneNo ?? '').trim()
      return !phoneNo
    }

    if (runtimeType === 'FILE_UPLOAD' || runtimeType === 'IMAGE_UPLOAD') {
      return !value.fileId && !value.itemId && !value.fileName && !value.rawFile
    }

    if (runtimeType === 'MATRIX') {
      return !Object.entries(value).some(
        ([k, v]) =>
          !k.startsWith('_') &&
          v !== undefined &&
          v !== null &&
          (Array.isArray(v) ? v.length > 0 : String(v).trim() !== ''),
      )
    }

    return Object.keys(value).length === 0
  }

  return false
}

/**
 * Validates a single form field value against all configured validation rules:
 * - Required / mandatory check (including `requiredValidation: 'ALL'`)
 * - Format / content rules (`EMAIL`, `WEB`, `ALPHABETIC`, `ALPHANUMERIC`, `NUMERIC`, `INTEGER`, `CUSTOM_REGEX`)
 * - Text length ranges (`minimum`, `maximum`, `rangeType`)
 * - Numeric boundaries (`minimum`, `maximum`, dynamic `minimumNumberField`, `maximumNumberField`)
 * - Decimal precision (`decimalValue` / `decimalDigits`)
 * - Date and time limit bounds
 * - File requirements (`allowedFileTypes`, `maxFileSize`)
 * - Table row/column rules
 * - Matrix completion rules
 */
export function validateFieldValue(
  field: any,
  value: any,
  formModel: Record<string, any> = {},
  options?: { isRequiredOverride?: boolean },
): FieldValidationResult {
  const errors: string[] = []
  if (!field) return { errors: [], isValid: true }

  const valSettings = field.settings?.validation || {}
  const runtimeType = resolveRuntimeFieldType(field)
  const label = getEffectiveFieldLabel(field)
  const isRequired =
    options?.isRequiredOverride !== undefined
      ? options.isRequiredOverride
      : isFieldRequired(field)

  const isEmpty = isRuntimeValueEmpty(value, field)

  // 1. Required Check
  if (isRequired && isEmpty) {
    errors.push(`${label} should not be empty`)
    return { error: errors[0], errors, isValid: false }
  }

  // If empty and not required, no further format/range errors apply
  if (isEmpty) {
    return { errors: [], isValid: true }
  }

  // 2. Multi-choice / Multi-select "ALL" requirement
  if (
    runtimeType === 'MULTIPLE_CHOICE' ||
    runtimeType === 'MULTI_SELECT'
  ) {
    if (valSettings.requiredValidation === 'ALL') {
      const fieldOpts =
        field.settings?.specific?.options ||
        field.settings?.specific?.customOptions ||
        []
      const totalOptionsCount = Array.isArray(fieldOpts)
        ? fieldOpts.length
        : typeof fieldOpts === 'string'
          ? fieldOpts.split(/[\n,]/).filter(Boolean).length
          : 0
      const selectedCount = Array.isArray(value)
        ? value.length
        : typeof value === 'string' && value.trim()
          ? value.split(',').filter(Boolean).length
          : 0
      if (totalOptionsCount > 0 && selectedCount < totalOptionsCount) {
        errors.push(`Please select all the options above to proceed`)
      }
    }
  }

  // 3. Format / Content Rules
  const contentRule = String(
    valSettings.contentRule ||
      (runtimeType === 'EMAIL' ? 'EMAIL' : '') ||
      (runtimeType === 'URL' ? 'WEB' : ''),
  ).toUpperCase()

  if (contentRule === 'EMAIL') {
    const strVal = String(value).trim()
    if (!EMAIL_REGEX.test(strVal)) {
      errors.push(`email is not valid`)
    }
  } else if (contentRule === 'WEB' || contentRule === 'URL') {
    const strVal = String(value).trim()
    if (!URL_REGEX.test(strVal)) {
      errors.push(`url is not valid`)
    }
  } else if (contentRule === 'ALPHABETIC' || contentRule === 'ALPHA') {
    const strVal = String(value).trim()
    if (!ALPHA_REGEX.test(strVal)) {
      errors.push(`should contain only alphabetic characters and spaces`)
    }
  } else if (contentRule === 'ALPHANUMERIC' || contentRule === 'ALPHA_NUM') {
    const strVal = String(value).trim()
    if (!ALPHANUMERIC_REGEX.test(strVal)) {
      errors.push(`should contain only alphabetic characters and numbers`)
    }
  } else if (contentRule === 'NUMERIC' || contentRule === 'NUMBER') {
    const strVal = String(value).trim()
    if (!NUMERIC_REGEX.test(strVal)) {
      errors.push(`should be a valid number`)
    }
  } else if (contentRule === 'INTEGER') {
    const strVal = String(value).trim()
    if (!INTEGER_REGEX.test(strVal)) {
      errors.push(`should be a number without decimals`)
    }
  } else if (contentRule === 'CUSTOM_REGEX' || valSettings.customRegex) {
    const regexPattern = valSettings.customRegex || valSettings.regex
    if (regexPattern) {
      try {
        const re = new RegExp(regexPattern)
        if (!re.test(String(value))) {
          errors.push(valSettings.customRegexMessage || `format is not valid`)
        }
      } catch {
        // Ignore invalid regex compilation
      }
    }
  }

  // 4. Text Length Boundaries (SHORT_TEXT, LONG_TEXT, ADDRESS, PASSWORD)
  if (
    runtimeType === 'SHORT_TEXT' ||
    runtimeType === 'LONG_TEXT' ||
    runtimeType === 'ADDRESS' ||
    runtimeType === 'PASSWORD'
  ) {
    const strLen = String(value).trim().length
    const rangeType = String(valSettings.rangeType || '').toUpperCase()
    const minVal =
      valSettings.minimum !== undefined && valSettings.minimum !== null
        ? Number(valSettings.minimum)
        : null
    const maxVal =
      valSettings.maximum !== undefined && valSettings.maximum !== null
        ? Number(valSettings.maximum)
        : null

    if (
      (rangeType === 'MINIMUM' ||
        rangeType === 'RANGE' ||
        rangeType === 'MIN_FIXED_MAX_FLEX') &&
      minVal !== null &&
      Number.isFinite(minVal) &&
      minVal > 0
    ) {
      if (strLen < minVal) {
        errors.push(`should not be less than ${minVal} characters`)
      }
    }

    if (
      (rangeType === 'MAXIMUM' ||
        rangeType === 'RANGE' ||
        rangeType === 'MIN_FLEX_MAX_FIXED') &&
      maxVal !== null &&
      Number.isFinite(maxVal) &&
      maxVal > 0
    ) {
      if (strLen > maxVal) {
        errors.push(`should not be more than ${maxVal} characters`)
      }
    }
  }

  // 5. Numeric Bounds (NUMBER, COUNTER, CURRENCY_AMOUNT)
  if (
    runtimeType === 'NUMBER' ||
    runtimeType === 'COUNTER' ||
    runtimeType === 'CURRENCY_AMOUNT'
  ) {
    const numericVal =
      runtimeType === 'CURRENCY_AMOUNT' || isStructuredCurrencyValue(value)
        ? Number(extractCurrencyNumericValue(value))
        : Number(value)

    if (Number.isFinite(numericVal)) {
      // Dynamic minimum comparison
      if (valSettings.minimumNumberField) {
        const dynMinFieldVal = formModel[valSettings.minimumNumberField]
        const dynMin =
          dynMinFieldVal !== undefined && dynMinFieldVal !== null
            ? Number(extractCurrencyNumericValue(dynMinFieldVal))
            : null
        if (dynMin !== null && Number.isFinite(dynMin) && numericVal < dynMin) {
          errors.push(`should not be less than minimum field value (${dynMin})`)
        }
      } else if (
        valSettings.minimum !== undefined &&
        valSettings.minimum !== null &&
        valSettings.minimum !== ''
      ) {
        const minNum = Number(valSettings.minimum)
        if (Number.isFinite(minNum) && numericVal < minNum) {
          errors.push(`should not be less than ${minNum}`)
        }
      }

      // Dynamic maximum comparison
      if (valSettings.maximumNumberField) {
        const dynMaxFieldVal = formModel[valSettings.maximumNumberField]
        const dynMax =
          dynMaxFieldVal !== undefined && dynMaxFieldVal !== null
            ? Number(extractCurrencyNumericValue(dynMaxFieldVal))
            : null
        if (dynMax !== null && Number.isFinite(dynMax) && numericVal > dynMax) {
          errors.push(`should not be more than maximum field value (${dynMax})`)
        }
      } else if (
        valSettings.maximum !== undefined &&
        valSettings.maximum !== null &&
        valSettings.maximum !== ''
      ) {
        const maxNum = Number(valSettings.maximum)
        if (Number.isFinite(maxNum) && numericVal > maxNum) {
          errors.push(`should not be more than ${maxNum}`)
        }
      }

      // Decimal precision
      const decimalDigits =
        valSettings.decimalValue ?? valSettings.decimalDigits
      if (
        decimalDigits !== undefined &&
        decimalDigits !== null &&
        decimalDigits !== ''
      ) {
        const allowedDecimals = Number(decimalDigits)
        if (Number.isFinite(allowedDecimals) && allowedDecimals >= 0) {
          const parts = String(numericVal).split('.')
          if (parts[1] && parts[1].length > allowedDecimals) {
            errors.push(
              `decimal places should not exceed ${allowedDecimals} digits`,
            )
          }
        }
      }
    } else {
      errors.push(`should be a valid number`)
    }
  }

  // 6. Phone Number Format
  if (runtimeType === 'PHONE_NUMBER' || isStructuredPhoneValue(value)) {
    const phoneDigits = extractPhoneInputString(value).replace(/\D/g, '')
    if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      errors.push(`phone number is not valid`)
    }
  }

  // 7. Date Boundaries
  if (runtimeType === 'DATE' || runtimeType === 'DATE_TIME') {
    const dateStr = String(value).split(' ')[0]
    if (valSettings.minDate && dayjs(dateStr).isBefore(dayjs(valSettings.minDate))) {
      errors.push(`should be greater than or equal to ${valSettings.minDate}`)
    }
    if (valSettings.maxDate && dayjs(dateStr).isAfter(dayjs(valSettings.maxDate))) {
      errors.push(`should be lesser than or equal to ${valSettings.maxDate}`)
    }
  }

  // 8. File Upload Validation
  if (runtimeType === 'FILE_UPLOAD' || runtimeType === 'IMAGE_UPLOAD') {
    const files = Array.isArray(value) ? value : [value]
    const allowedTypes: string[] = Array.isArray(valSettings.allowedFileTypes)
      ? valSettings.allowedFileTypes.map((t: string) =>
          t.replace(/^\./, '').toLowerCase(),
        )
      : typeof valSettings.allowedFileTypes === 'string' &&
          valSettings.allowedFileTypes.trim()
        ? valSettings.allowedFileTypes
            .split(/[\n,]/)
            .map((s: string) => s.replace(/^\./, '').trim().toLowerCase())
            .filter(Boolean)
        : []

    const maxMb =
      valSettings.maxFileSize !== undefined && valSettings.maxFileSize !== null
        ? Number(valSettings.maxFileSize)
        : null

    for (const f of files) {
      if (!f) continue
      const name = String(f.name || f.fileName || '')
      if (name && allowedTypes.length > 0) {
        const ext = name.split('.').reverse()[0]?.toLowerCase()
        if (ext && !allowedTypes.includes(ext)) {
          errors.push(`should be a ${allowedTypes.join(' | ')} file`)
          break
        }
      }
      if (maxMb !== null && Number.isFinite(maxMb) && maxMb > 0) {
        const sizeBytes = f.size || f.fileSize
        if (typeof sizeBytes === 'number') {
          const mb = sizeBytes / (1024 * 1024)
          if (mb > maxMb) {
            errors.push(`file size should not be more than ${maxMb} mb`)
            break
          }
        }
      }
    }
  }

  // 9. Table Validation
  if (runtimeType === 'TABLE' || runtimeType === 'DYNAMIC_TABLE') {
    if (Array.isArray(value)) {
      const cols = field.settings?.specific?.tableColumns || []
      const reqCols = cols.filter(
        (c: any) =>
          c.settings?.validation?.fieldRule === 'REQUIRED' ||
          c.isRequired ||
          c.required,
      )

      for (let rowIdx = 0; rowIdx < value.length; rowIdx += 1) {
        const row = value[rowIdx] || {}
        for (const reqCol of reqCols) {
          const colVal = row[reqCol.id] ?? (reqCol.name ? row[reqCol.name] : undefined)
          if (isRuntimeValueEmpty(colVal, reqCol)) {
            const colLabel = getEffectiveColumnLabel(reqCol)
            errors.push(
              `Row ${rowIdx + 1}: ${colLabel} is required and cannot be empty`,
            )
          }
        }
      }
    }
  }

  // 10. Matrix Validation
  if (runtimeType === 'MATRIX') {
    if (valSettings.requiredValidation === 'ALL') {
      const cfg = getNormalizedMatrixConfig(field)
      for (const row of cfg.rows) {
        const rowVal =
          value && typeof value === 'object'
            ? value[row.id] ?? value[row.label] ?? value[row.key]
            : undefined
        if (isRuntimeValueEmpty(rowVal)) {
          errors.push(`Matrix row "${row.label}" must be answered`)
        }
      }
    }
  }

  return {
    error: errors[0],
    errors,
    isValid: errors.length === 0,
  }
}

/**
 * Validates an entire form model across all panels and fields.
 *
 * Automatically suppresses validation for fields that are:
 * - Hidden by static settings or dynamic conditional rules (`visible === false`)
 * - Disabled or read-only by static settings or dynamic conditional rules (`disabled === true`)
 */
export function validateFormModel(
  panels: any[] = [],
  formModel: Record<string, any> = {},
  options?: {
    formRules?: any[]
    hasAttemptedSubmit?: boolean
  },
): FormValidationResult {
  const errors: Record<string, string> = {}
  const fieldErrors: Record<string, string[]> = {}
  const missingFields: Array<{ id: string; label: string }> = []

  const computedStates = evaluateFormRules(panels, formModel, options?.formRules)

  for (const panel of panels) {
    if (panel?.id && computedStates[panel.id]?.visible === false) {
      continue
    }

    for (const field of panel.fields || []) {
      const fieldId = String(field.id || field.jsonId || '')
      if (!fieldId) continue

      const state = computedStates[field.id]
      const isHidden = state ? !state.visible : isFieldHidden(field)
      const isReadOnly = state
        ? state.disabled
        : isFieldReadOnly(field)

      // Hidden or read-only fields are never blocking or validated
      if (isHidden || isReadOnly) continue

      const isRequired = state ? state.required : isFieldRequired(field)
      const val = formModel[field.id] ?? (field.jsonId ? formModel[field.jsonId] : undefined)

      const fieldRes = validateFieldValue(field, val, formModel, {
        isRequiredOverride: isRequired,
      })

      if (!fieldRes.isValid) {
        errors[field.id] = fieldRes.error!
        fieldErrors[field.id] = fieldRes.errors
        if (field.jsonId) {
          errors[field.jsonId] = fieldRes.error!
          fieldErrors[field.jsonId] = fieldRes.errors
        }
        if (isRuntimeValueEmpty(val, field) && isRequired) {
          missingFields.push({
            id: fieldId,
            label: getEffectiveFieldLabel(field),
          })
        }
      }
    }
  }

  return {
    errors,
    fieldErrors,
    isValid: Object.keys(errors).length === 0,
    missingFields,
  }
}
