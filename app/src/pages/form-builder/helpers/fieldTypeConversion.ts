import type { Question, QuestionType } from '@/pages/form-builder/store/formStore'
import { getField } from '@/helpers/new-field'

export const FIELD_TYPE_LABELS: Partial<Record<QuestionType, string>> = {
  ADDRESS: 'Address',
  CALCULATED: 'Calculated',
  COUNTER: 'Counter',
  CURRENCY_AMOUNT: 'Currency',
  DATE: 'Date',
  DATE_TIME: 'Date & Time',
  DIVIDER: 'Divider',
  DYNAMIC_TABLE: 'Dynamic Table',
  EMAIL: 'Email',
  FILE_UPLOAD: 'File Upload',
  HEADING: 'Heading',
  IMAGE_UPLOAD: 'Image Upload',
  LONG_TEXT: 'Long Text',
  MATRIX: 'Matrix',
  MULTI_SELECT: 'Multi Select',
  MULTIPLE_CHOICE: 'Multiple Choice',
  NUMBER: 'Number',
  OPINION_SCALE: 'Opinion Scale',
  PARAGRAPH: 'Paragraph',
  PHONE_NUMBER: 'Phone Number',
  RATING: 'Rating',
  SHORT_TEXT: 'Short Text',
  SIGNATURE: 'Signature',
  SINGLE_CHOICE: 'Single Choice',
  SINGLE_SELECT: 'Single Select',
  TABLE: 'Table',
  TIME: 'Time',
  URL: 'URL',
  YES_NO_TOGGLE: 'Yes/No Toggle',
}

/** Types a field can be switched to. Any listed type converts to any other. */
export const CONVERTIBLE_TYPES = Object.keys(
  FIELD_TYPE_LABELS,
) as QuestionType[]

export const isConvertibleType = (type: QuestionType): boolean =>
  CONVERTIBLE_TYPES.includes(type)

/**
 * Returns the question switched to `newType`. Only the id and label carry
 * over; every other setting is reset to the new type's defaults.
 */
export const convertQuestionType = (
  question: Question,
  newType: QuestionType,
): Question => {
  if (question.type === newType) return question
  const fresh = getField(newType) as Question
  return {
    ...fresh,
    id: question.id,
    label: question.label,
  }
}
