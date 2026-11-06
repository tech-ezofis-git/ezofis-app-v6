const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** The parts of a form-definition field that decide eligibility. */
interface FormField {
  type?: string
  settings?: {
    specific?: { customOptions?: string; optionsType?: string }
    validation?: { contentRule?: string }
  }
}

// Controls whose saved value can hold one or more email addresses.
const DYNAMIC_USER_FIELD_TYPES = new Set([
  'EMAIL',
  'MULTIPLE_CHOICE',
  'MULTI_SELECT',
  'SINGLE_CHOICE',
  'SINGLE_SELECT',
])

/** Whether a form field can drive Dynamic User (Form Input) routing. */
export const isDynamicUserField = (field: FormField): boolean => {
  const type = String(field?.type || '').toUpperCase()
  if (DYNAMIC_USER_FIELD_TYPES.has(type)) return true
  // A text box restricted to emails saves the same value as an Email field.
  return (
    type === 'SHORT_TEXT' &&
    String(field?.settings?.validation?.contentRule || '').toUpperCase() ===
      'EMAIL'
  )
}

/**
 * True when the field's typed-in option list has no email in it, so it can
 * never produce an assignee. Other option sources load at runtime and are
 * only checked when the request reaches the stage.
 */
export const hasNoEmailOptions = (field: FormField): boolean => {
  const specific = field?.settings?.specific
  const optionsType = specific?.optionsType || 'CUSTOM'
  const customOptions = String(specific?.customOptions || '').trim()
  if (optionsType !== 'CUSTOM' || !customOptions) return false

  return !customOptions
    .split(/[\n,]/)
    .some((option) => EMAIL_PATTERN.test(option.trim()))
}
