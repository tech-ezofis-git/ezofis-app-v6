export type InitiateUsingType = 'DOCUMENT' | 'FORM' | 'DOCUMENT_FORM'

export const normalizeInitiateUsing = (
  val?: string | null,
): InitiateUsingType => {
  const s = String(val || '')
    .toUpperCase()
    .replace(/[-_]/g, '')
  if (s === 'DOCUMENT') return 'DOCUMENT'
  if (s === 'FORM') return 'FORM'
  return 'DOCUMENT_FORM'
}

/**
 * Checks whether a given field value is genuinely filled.
 * Returns false for null, undefined, empty/whitespace strings, "0", 0, negative numbers,
 * "null", "undefined", template placeholders like "{{formId}}", or empty objects.
 */
export const isFilledValue = (val: unknown): boolean => {
  if (val === null || val === undefined) return false

  if (typeof val === 'number') {
    return !isNaN(val) && val > 0
  }

  if (typeof val === 'string') {
    const trimmed = val.trim()
    if (!trimmed) return false
    if (
      trimmed === '0' ||
      trimmed === 'null' ||
      trimmed === 'undefined' ||
      trimmed === 'false' ||
      trimmed === 'NaN'
    ) {
      return false
    }
    if (trimmed.startsWith('{{') && trimmed.endsWith('}}')) {
      return false
    }
    const num = Number(trimmed)
    if (!isNaN(num) && num <= 0) {
      return false
    }
    return true
  }

  if (typeof val === 'object') {
    if (Array.isArray(val)) {
      return val.length > 0
    }
    if ('id' in (val as Record<string, unknown>)) {
      return isFilledValue((val as Record<string, unknown>).id)
    }
    return Object.keys(val as Record<string, unknown>).length > 0
  }

  return Boolean(val)
}

export interface WorkflowValidationErrors {
  name?: string
  folder?: string
  form?: string
}

export interface WorkflowValidationResult {
  isValid: boolean
  firstError?: string
  errors: WorkflowValidationErrors
  failedSection?: 'general' | 'configuration'
}

export const validateWorkflowSettings = (settings: {
  workflowName?: string | null
  initiateUsing?: string | null
  folder?: string | number | null
  form?: string | number | null
}): WorkflowValidationResult => {
  const errors: WorkflowValidationErrors = {}
  let firstError: string | undefined
  let failedSection: 'general' | 'configuration' | undefined

  if (!isFilledValue(settings.workflowName)) {
    errors.name = 'Workflow name is required'
    firstError = errors.name
    failedSection = 'general'
  }

  const rawInitiate = settings.initiateUsing
  if (!isFilledValue(rawInitiate)) {
    const errorMsg = 'Initiate Using is required'
    if (!firstError) {
      firstError = errorMsg
      failedSection = 'configuration'
    }
  }

  const initiateType = normalizeInitiateUsing(settings.initiateUsing)
  const isFolderRequired =
    initiateType === 'DOCUMENT' || initiateType === 'DOCUMENT_FORM'
  const isFormRequired =
    initiateType === 'FORM' || initiateType === 'DOCUMENT_FORM'

  const hasFolder = isFilledValue(settings.folder)
  const hasForm = isFilledValue(settings.form)

  if (isFolderRequired && isFormRequired && !hasFolder && !hasForm) {
    errors.folder = 'Folder is required'
    errors.form = 'Form is required'
    if (!firstError) {
      firstError = 'Folder and Form are required'
      failedSection = 'configuration'
    }
  } else {
    if (isFolderRequired && !hasFolder) {
      const errorMsg = 'Folder is required'
      errors.folder = errorMsg
      if (!firstError) {
        firstError = errorMsg
        failedSection = 'configuration'
      }
    }

    if (isFormRequired && !hasForm) {
      const errorMsg = 'Form is required'
      errors.form = errorMsg
      if (!firstError) {
        firstError = errorMsg
        failedSection = 'configuration'
      }
    }
  }

  return {
    errors,
    failedSection,
    firstError,
    isValid: !firstError,
  }
}
