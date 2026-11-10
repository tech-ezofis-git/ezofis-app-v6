import type {
  Question,
  QuestionType,
} from '@/pages/form-builder/store/formStore'
import { FIELD_TYPE_NAMES } from '@/helpers/fieldTypeNames'
import { getField } from '@/helpers/new-field'

const CONVERTIBLE_TYPE_IDS = [
  'ADDRESS',
  'CALCULATED',
  'COUNTER',
  'CURRENCY_AMOUNT',
  'DATE',
  'DATE_TIME',
  'DIVIDER',
  'DYNAMIC_TABLE',
  'EMAIL',
  'FILE_UPLOAD',
  'HEADING',
  'IMAGE_UPLOAD',
  'LONG_TEXT',
  'MATRIX',
  'MULTI_SELECT',
  'MULTIPLE_CHOICE',
  'NUMBER',
  'OPINION_SCALE',
  'PARAGRAPH',
  'PHONE_NUMBER',
  'RATING',
  'SHORT_TEXT',
  'SIGNATURE',
  'SINGLE_CHOICE',
  'SINGLE_SELECT',
  'TABLE',
  'TIME',
  'URL',
  'YES_NO_TOGGLE',
] as const satisfies readonly QuestionType[]

// The names come from the one shared list, so a type has the same name everywhere.
export const FIELD_TYPE_LABELS: Partial<Record<QuestionType, string>> =
  Object.fromEntries(
    CONVERTIBLE_TYPE_IDS.map((type) => [type, FIELD_TYPE_NAMES[type]]),
  )

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
