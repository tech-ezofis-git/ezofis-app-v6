import type { Option } from '@/types/option'
import {
  buildSyntheticField,
  getFieldOptions,
  isFieldHidden,
  isFieldRequired,
  mapOcrFieldsToModel,
  PRESENTATIONAL_TYPES,
  type RepoFieldDescriptor,
} from '@/pages/requests/components/workflow-request/utils/fieldRendering'
import { isFilenameField } from '@/pages/requests/utils/repoFolderMetadata'

const FILE_FIELD_TYPES = new Set(['FILE_UPLOAD', 'IMAGE_UPLOAD'])

export type AnswerMap = Record<string, unknown>
export type FormControl = Record<string, unknown>
export type FormPanel = FormControl & {
  controlList?: FormControl[]
  controllist?: FormControl[]
  fields?: FormControl[]
}

export type PortalFormQuestion = {
  field: FormControl
  id: string
  label: string
  options: Option[]
  placeholder?: string
  required: boolean
  type: string
}

export type PortalQuestionPanel = {
  id: string
  questions: PortalFormQuestion[]
  title: string
}

const asRecord = (value: unknown): FormControl =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as FormControl)
    : {}

const asControlList = (value: unknown): FormControl[] =>
  Array.isArray(value) ? (value as FormControl[]) : []

export const unwrapFormJson = (input: unknown): FormControl => {
  if (!input) return {}
  let target: unknown = input
  if (typeof target === 'string') {
    try {
      target = JSON.parse(target)
    } catch {
      return {}
    }
  }
  const record = asRecord(target)
  if (record.formJson) {
    if (typeof record.formJson === 'string') {
      try {
        return asRecord(JSON.parse(record.formJson))
      } catch {
        return asRecord(record.formJson)
      }
    }
    return asRecord(record.formJson)
  }
  return record
}

export const collectFormPanels = (formJson: unknown): FormPanel[] => {
  const target = unwrapFormJson(formJson)
  return [
    ...asControlList(target.panels),
    ...asControlList(target.secondaryPanels),
  ] as FormPanel[]
}

export const normalizeFormPanels = (panels: FormPanel[]): FormPanel[] =>
  panels.map((panel) => ({
    ...panel,
    fields: [
      ...asControlList(panel.fields),
      ...asControlList(panel.controlList),
      ...asControlList(panel.controllist),
    ],
  }))

const collectRawControls = (formJson: unknown): FormControl[] => {
  const target = unwrapFormJson(formJson)
  const controls: FormControl[] = [
    ...asControlList(target.controllist),
    ...asControlList(target.controlList),
  ]

  collectFormPanels(target).forEach((panel) => {
    controls.push(
      ...asControlList(panel.controlList),
      ...asControlList(panel.controllist),
      ...asControlList(panel.fields),
    )
  })

  return controls
}

export const isQuestionField = (field: FormControl): boolean => {
  if (!field) return false
  const type = String(field.type || '').toUpperCase()
  if (PRESENTATIONAL_TYPES.has(type)) return false
  if (FILE_FIELD_TYPES.has(type)) return false
  if (
    type.includes('DIVIDER') ||
    type.includes('PARAGRAPH') ||
    type === 'TABLE' ||
    type === 'DYNAMIC_TABLE' ||
    type === 'MATRIX' ||
    type === 'SIGNATURE' ||
    type === 'ADDRESS'
  ) {
    return false
  }
  if (isFieldHidden(field)) return false
  return Boolean(field.id || field.jsonId || field.name || field.label)
}

export const isFieldMandatory = (field: FormControl): boolean => {
  const settings = asRecord(field.settings)
  const validation = asRecord(settings.validation)
  return (
    isFieldRequired(field) ||
    Boolean(
      field.isRequired ||
      field.required ||
      field.isMandatory ||
      validation.required,
    )
  )
}

const optionFromUnknown = (option: unknown): Option | null => {
  if (typeof option === 'string') return { id: option, name: option }
  const record = asRecord(option)
  const name = String(
    record.name || record.label || record.text || record.value || '',
  )
  if (!name) return null
  return { id: String(record.id ?? record.value ?? name), name }
}

export const getQuestionOptions = (field: FormControl): Option[] => {
  const type = String(field.type || '').toUpperCase()
  const isSelect =
    type === 'SINGLE_SELECT' ||
    type === 'SINGLE_CHOICE' ||
    type === 'MULTI_SELECT' ||
    type === 'MULTIPLE_CHOICE'
  if (!isSelect) return []

  const fromSettings = getFieldOptions(field)
  if (fromSettings.length) {
    return fromSettings.map((option) => ({
      id: String(option.id),
      name: option.name,
    }))
  }

  const specific = asRecord(asRecord(field.settings).specific)
  const rawOptions =
    field.options ||
    field.items ||
    field.choiceOptions ||
    field.values ||
    specific.options ||
    []

  if (Array.isArray(rawOptions) && rawOptions.length) {
    return rawOptions
      .map(optionFromUnknown)
      .filter((option): option is Option => Boolean(option))
  }

  return []
}

export const toFormQuestion = (
  field: FormControl,
  index: number,
): PortalFormQuestion => {
  const settings = asRecord(field.settings)
  const general = asRecord(settings.general)
  const id = String(
    field.jsonId ||
      field.id ||
      field.name ||
      field.columnName ||
      `field_${index}`,
  )
  const label = String(
    field.label ||
      field.name ||
      field.title ||
      field.jsonId ||
      `Field ${index + 1}`,
  )
  const type = String(
    field.type || field.controlType || field.dataType || 'SHORT_TEXT',
  )
  return {
    field,
    id,
    label,
    options: getQuestionOptions(field),
    placeholder: String(general.placeholder || field.placeholder || ''),
    required: isFieldMandatory(field),
    type,
  }
}

export const parseFormQuestions = (formJson: unknown): PortalFormQuestion[] =>
  collectRawControls(formJson).filter(isQuestionField).map(toFormQuestion)

export const parseQuestionPanels = (
  formJson: unknown,
  fallbackTitle?: string,
): PortalQuestionPanel[] => {
  const panels = collectFormPanels(formJson)
  const result: PortalQuestionPanel[] = []

  panels.forEach((panel, index) => {
    const fields = [
      ...asControlList(panel.fields),
      ...asControlList(panel.controlList),
      ...asControlList(panel.controllist),
    ]
    const questions = fields.filter(isQuestionField).map(toFormQuestion)
    if (!questions.length) return
    const settings = asRecord(panel.settings)
    const title =
      String(settings.title || settings.name || '').trim() ||
      fallbackTitle ||
      (questions.length === 1
        ? questions[0].label
        : `Section ${result.length + 1}`)
    result.push({
      id: String(panel.id || `panel_${index}`),
      questions,
      title,
    })
  })

  if (!result.length) {
    const questions = parseFormQuestions(formJson)
    if (questions.length) {
      result.push({
        id: 'panel_0',
        questions,
        title: fallbackTitle || questions[0].label,
      })
    }
  }

  return result
}

export const isDateQuestion = (question: PortalFormQuestion) => {
  const type = String(question.type || '').toUpperCase()
  return type === 'DATE' || type === 'DATE_TIME' || type.includes('DATE')
}

export const isSelectQuestion = (question: PortalFormQuestion) => {
  if (isDateQuestion(question)) return false
  const type = String(question.type || '').toUpperCase()
  return (
    (type === 'SINGLE_SELECT' ||
      type === 'SINGLE_CHOICE' ||
      type === 'MULTI_SELECT' ||
      type === 'MULTIPLE_CHOICE') &&
    question.options.length > 0
  )
}

export type PortalFileField = {
  id: string
  label: string
  required: boolean
  type: string
}

export const isFileField = (field: FormControl): boolean =>
  FILE_FIELD_TYPES.has(String(field.type || '').toUpperCase())

export const parseFileFields = (formJson: unknown): PortalFileField[] =>
  collectRawControls(formJson)
    .filter(isFileField)
    .map((field, index) => ({
      id: String(
        field.jsonId ||
          field.id ||
          field.name ||
          field.columnName ||
          `file_${index}`,
      ),
      label: String(
        field.label || field.name || field.title || `Attachment ${index + 1}`,
      ),
      required: isFieldMandatory(field),
      type: String(field.type || 'FILE_UPLOAD'),
    }))

export const isAnswerFilled = (value: unknown): boolean => {
  if (value === undefined || value === null) return false
  if (typeof value === 'boolean') return true
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') {
    const record = asRecord(value)
    return Boolean(
      record.fileName || record.fileId || Object.keys(record).length,
    )
  }
  return String(value).trim() !== ''
}

export const isQuestionVisited = (value: unknown) => value !== undefined

const namedValue = (item: unknown): string => {
  if (typeof item !== 'object' || item === null) return String(item)
  const record = asRecord(item)
  return String(record.name || record.label || record.id || '')
}

export const formatAnswer = (value: unknown): string => {
  if (!isAnswerFilled(value)) return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) {
    return value.map(namedValue).filter(Boolean).join(', ')
  }
  if (typeof value === 'object' && value) {
    const record = asRecord(value)
    return String(record.fileName || record.name || JSON.stringify(value))
  }
  return String(value)
}

const flattenInboxValue = (value: unknown): unknown => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const record = asRecord(value)
    if (
      record.value !== undefined &&
      record.value !== null &&
      record.value !== ''
    ) {
      return record.value
    }
  }
  return value
}

export const parseInboxFormData = (raw: unknown): AnswerMap => {
  if (!raw) return {}

  let parsed: unknown = raw
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed)
    } catch {
      return {}
    }
  }
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed)
    } catch {
      return {}
    }
  }

  const record = asRecord(parsed)
  const nested = asRecord(record.fields)
  const source = Object.keys(nested).length ? nested : record
  const result: AnswerMap = {}
  Object.entries(source).forEach(([key, value]) => {
    result[key] = flattenInboxValue(value)
  })
  return result
}

const normalizeMatchKey = (value: unknown) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')

const questionMatchesKey = (question: PortalFormQuestion, key: string) => {
  const normalizedKey = normalizeMatchKey(key)
  return (
    question.id === key ||
    question.field.jsonId === key ||
    question.field.id === key ||
    question.field.name === key ||
    question.field.columnName === key ||
    question.label.toLowerCase() === key.toLowerCase() ||
    normalizeMatchKey(question.id) === normalizedKey ||
    normalizeMatchKey(question.field.jsonId) === normalizedKey ||
    normalizeMatchKey(question.field.id) === normalizedKey ||
    normalizeMatchKey(question.field.name) === normalizedKey ||
    normalizeMatchKey(question.label) === normalizedKey
  )
}

export const mergeExtractedAnswers = (
  questions: PortalFormQuestion[],
  current: AnswerMap,
  extracted: AnswerMap,
): AnswerMap => {
  const next = { ...current }

  Object.entries(extracted || {}).forEach(([key, rawValue]) => {
    if (rawValue === undefined || rawValue === null || rawValue === '') return

    let value: unknown = rawValue
    if (
      typeof rawValue === 'string' &&
      (rawValue.startsWith('[') || rawValue.startsWith('{'))
    ) {
      try {
        value = JSON.parse(rawValue)
      } catch {
        value = rawValue
      }
    }

    const question = questions.find((item) => questionMatchesKey(item, key))
    if (!question) return
    next[question.id] = value
    if (question.field.id) next[String(question.field.id)] = value
    if (question.field.jsonId) next[String(question.field.jsonId)] = value
  })

  return next
}

const assignQuestionValue = (
  next: AnswerMap,
  question: PortalFormQuestion,
  value: unknown,
) => {
  next[question.id] = value
  if (question.field.id) next[String(question.field.id)] = value
  if (question.field.jsonId) next[String(question.field.jsonId)] = value
}

export const applyOcrFieldListToAnswers = (
  questions: PortalFormQuestion[],
  panels: FormPanel[],
  current: AnswerMap,
  ocrFieldList: { name?: string; value?: string }[] | undefined,
): AnswerMap => {
  const named: AnswerMap = {}
  ;(ocrFieldList || []).forEach((item) => {
    if (!item?.name || item.value == null || String(item.value).trim() === '')
      return
    named[item.name] = item.value
  })
  const patch = mapOcrFieldsToModel(panels, ocrFieldList)
  const next = mergeExtractedAnswers(questions, current, {
    ...named,
    ...patch,
  })
  Object.entries(patch).forEach(([key, value]) => {
    if (next[key] === undefined) next[key] = value
  })
  questions.forEach((question) => {
    const fromPatch =
      patch[question.id] ||
      (question.field.id ? patch[String(question.field.id)] : undefined) ||
      (question.field.jsonId ? patch[String(question.field.jsonId)] : undefined)
    if (fromPatch !== undefined) assignQuestionValue(next, question, fromPatch)

    const ocrMatch = (ocrFieldList || []).find((item) => {
      if (!item?.name || item.value == null || String(item.value).trim() === '')
        return false
      return (
        questionMatchesKey(question, item.name) ||
        normalizeMatchKey(question.label) === normalizeMatchKey(item.name)
      )
    })
    if (ocrMatch?.value != null)
      assignQuestionValue(next, question, ocrMatch.value)
  })
  return next
}

const withRequiredRule = (field: FormControl): FormControl => {
  const settings = asRecord(field.settings)
  const validation = asRecord(settings.validation)
  if (validation.fieldRule === 'REQUIRED') return field
  return {
    ...field,
    settings: {
      ...settings,
      validation: {
        ...validation,
        fieldRule: 'REQUIRED',
      },
    },
  }
}

// Folder-mandatory fields belong on the form: mark matching form fields as
// required, and append unmatched mandatory folder fields to the first panel.
export const applyRepoMandatoryToFormPanels = (
  panels: FormPanel[],
  descriptors: RepoFieldDescriptor[],
): FormPanel[] => {
  const mandatoryMatchedIds = new Set(
    descriptors
      .filter((item) => item.repoField.isMandatory && item.matchedFieldId)
      .flatMap((item) => [String(item.matchedFieldId)]),
  )

  const next = (panels || []).map((panel) => ({
    ...panel,
    fields: (panel.fields || []).map((field) => {
      const fieldId = String(field.id || '')
      const jsonId = String(field.jsonId || '')
      if (
        !mandatoryMatchedIds.has(fieldId) &&
        !mandatoryMatchedIds.has(jsonId)
      ) {
        return field
      }
      return withRequiredRule(field)
    }),
  }))

  const extraFields = descriptors
    .filter((item) => {
      if (item.matchedFieldId || !item.repoField.isMandatory) return false
      if (FILE_FIELD_TYPES.has(String(item.repoField.dataType || ''))) {
        return false
      }
      return !isFilenameField({
        name: item.repoField.name || '',
        sqlColumnName: item.repoField.sqlColumnName || '',
      })
    })
    .map((item) => buildSyntheticField(item.repoField) as FormControl)

  if (!extraFields.length) return next
  if (!next.length) {
    return [{ fields: extraFields, settings: { title: 'Details' } }]
  }
  return next.map((panel, index) =>
    index === 0
      ? { ...panel, fields: [...(panel.fields || []), ...extraFields] }
      : panel,
  )
}

export const buildPortalFormModel = (
  questions: PortalFormQuestion[],
  answers: AnswerMap,
): Record<string, unknown> => {
  const formModel: Record<string, unknown> = { ...answers }
  questions.forEach((question) => {
    const value = answers[question.id]
    if (value === undefined) return
    formModel[question.id] = value
    if (question.field.id) formModel[String(question.field.id)] = value
    if (question.field.jsonId) formModel[String(question.field.jsonId)] = value
  })
  return formModel
}
