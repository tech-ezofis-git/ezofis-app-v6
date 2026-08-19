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
