import type { Question, QuestionType } from '@/pages/form-builder/store/formStore'

const CONVERSION_GROUPS: QuestionType[][] = [
  ['SHORT_TEXT', 'LONG_TEXT', 'EMAIL', 'PHONE_NUMBER', 'URL'],
  ['SINGLE_CHOICE', 'MULTIPLE_CHOICE'],
  ['SINGLE_SELECT', 'MULTI_SELECT'],
  ['DATE', 'TIME', 'DATE_TIME'],
  ['NUMBER', 'CURRENCY_AMOUNT'],
  ['FILE_UPLOAD', 'IMAGE_UPLOAD'],
]

export const FIELD_TYPE_LABELS: Partial<Record<QuestionType, string>> = {
  CURRENCY_AMOUNT: 'Currency',
  DATE: 'Date',
  DATE_TIME: 'Date & Time',
  EMAIL: 'Email',
  FILE_UPLOAD: 'File Upload',
  IMAGE_UPLOAD: 'Image Upload',
  LONG_TEXT: 'Long Text',
  MULTI_SELECT: 'Multi Select',
  MULTIPLE_CHOICE: 'Multiple Choice',
  NUMBER: 'Number',
  PHONE_NUMBER: 'Phone Number',
  SHORT_TEXT: 'Short Text',
  SINGLE_CHOICE: 'Single Choice',
  SINGLE_SELECT: 'Single Select',
  TIME: 'Time',
  URL: 'URL',
}

/** Types the given field can be switched to, including its current type. */
export const getConvertibleTypes = (type: QuestionType): QuestionType[] =>
  CONVERSION_GROUPS.find((group) => group.includes(type)) ?? []

/**
 * Returns the updated question for a type switch. Label, id, general settings,
 * options and logic carry over; the default value and validation rules are
 * cleared (except required/optional) because their shape is type-specific.
 */
export const convertQuestionType = (
  question: Question,
  newType: QuestionType,
): Question => {
  if (
    question.type === newType ||
    !getConvertibleTypes(question.type).includes(newType)
  ) {
    return question
  }
  const { defaultValue: _defaultValue, ...specific } = (question.settings
    ?.specific ?? {}) as Record<string, unknown>
  return {
    ...question,
    settings: {
      ...question.settings,
      specific: specific as Question['settings']['specific'],
      validation: {
        fieldRule: question.settings?.validation?.fieldRule ?? 'OPTIONAL',
      },
    },
    type: newType,
  }
}
