/* eslint-disable @typescript-eslint/no-explicit-any */
import { notifications } from '@mantine/notifications'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import formApi from '@/api/form/form'
import { getField } from '@/helpers/new-field'
import {
  cloneFieldWithNewIds,
  clonePanelWithNewIds,
  mapV5LayoutToV6,
  normalizeFieldSchema,
  normalizeV5FormJson,
  serializeFieldForSave,
  serializeFormPayload,
  type V5CalculationRule,
} from '../helpers/v5SchemaAdapter'

export const generateId = () => {
  try {
    return crypto.randomUUID()
  } catch {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    )
  }
}

export type FormLayout =
  | 'SINGLE'
  | 'CLASSIC'
  | 'ACCORDION'
  | 'CARD'
  | 'TAB'
  | 'typeform'
  | 'grid'
  | 'full'

export interface FormStore {
  activePanelId: string | null
  activeQuestionId: string | null
  addFieldPosition: { index: number; panelId: string } | null
  conversationalMode: boolean
  coordinator: string
  description: string
  entryUser: string[]
  footerText: string
  formType: FormType
  headerText: string
  historyFuture: Panel[][]
  historyPast: Panel[][]
  hubLinkIds: any[]
  isBuilderMode: boolean
  isLeftSidebarCollapsed: boolean
  isPreviewOpen: boolean
  isPublishOpen: boolean
  isSidebarOpen: boolean
  lastAddedPanelId: string | null
  layout: FormLayout
  name: string
  panels: Panel[]
  previewMode: 'typeform' | 'grid' | 'full'
  publishStatus: PublishStatus
  qrFields: string[]
  rawFormRoot: Record<string, any>
  rawPublish: Record<string, any>
  rawSettings: Record<string, any>
  rawSettingsGeneral: Record<string, any>
  rules: V5CalculationRule[]
  secondaryPanels: Panel[]
  selectionType: 'general' | 'question'
  showHeaderFooter: boolean
  sidebarView: 'explorer' | 'fields'
  superUser: string[]
  uid: string
  uniqueColumns: string[]
  closedMessage?: string
  // Phase 4: Management
  responseLimit?: number
  scheduleEnd?: string

  scheduleStart?: string
  addPanel: (index?: number) => void
  addQuestion: (panelId: string, question: Question, index?: number) => void
  appendAIResponse: (data: any) => void
  clearLastAddedPanelId: () => void
  clearSelection: () => void
  deletePanel: (id: string) => void
  deleteQuestion: (id: string) => void
  duplicatePanel: (id: string) => void
  duplicateQuestion: (id: string) => void
  loadForm: (data: any) => void
  movePanel: (id: string, direction: 'up' | 'down') => void
  moveQuestion: (id: string, toPanelId: string, index: number) => void
  redo: () => void
  resetForm: () => void
  saveForm: (
    targetStatus?: PublishStatus,
    formId?: string,
  ) => Promise<{ createdFormId?: string; success: boolean }>
  undo: () => void
  updatePanel: (id: string, updates: Partial<Panel['settings']>) => void
  updateQuestion: (id: string, updates: any) => void
  setActivePanelId: (id: string | null) => void
  setActiveQuestionId: (id: string | null) => void
  setAddFieldPosition: (pos: { index: number; panelId: string } | null) => void
  setClosedMessage: (message: string) => void
  setConversationalMode: (enabled: boolean) => void
  setCoordinator: (coordinator: string) => void
  setDescription: (description: string) => void
  setEntryUser: (users: string[]) => void
  setFormType: (type: FormType) => void
  setHeaderFooter: (updates: {
    footer?: string
    header?: string
    show?: boolean
  }) => void
  setIsBuilderMode: (isBuilder: boolean) => void
  setIsPreviewOpen: (open: boolean) => void
  setLayout: (layout: FormLayout) => void
  setLeftSidebarCollapsed: (collapsed: boolean) => void
  setName: (name: string) => void
  setPanels: (panels: Panel[]) => void
  setPreviewMode: (mode: 'typeform' | 'grid' | 'full') => void
  setPublishOpen: (open: boolean) => void
  setPublishStatus: (status: PublishStatus) => void
  setQrFields: (fields: string[]) => void
  setResponseLimit: (limit: number | undefined) => void
  setRules: (rules: V5CalculationRule[]) => void
  setSchedule: (start?: string, end?: string) => void
  setSelectionType: (type: 'general' | 'question') => void
  setSidebarOpen: (open: boolean) => void
  setSidebarView: (view: 'explorer' | 'fields') => void
  setSuperUser: (users: string[]) => void
  setUniqueColumns: (columns: string[]) => void
}

export type FormType =
  | 'WORKFLOW'
  | 'FEEDBACK'
  | 'MASTER'
  | 'TASK'
  | 'SLA'
  | 'Feedback Form'

export interface LogicRule {
  action: 'SHOW' | 'HIDE' | 'ENABLE' | 'DISABLE' | 'REQUIRE'
  condition:
    | 'IS'
    | 'IS_NOT'
    | 'CONTAINS'
    | 'NOT_CONTAINS'
    | 'EMPTY'
    | 'NOT_EMPTY'
    | 'GT'
    | 'LT'
  fieldId: string // The field being checked
  id: string
  value: any
}

export interface Panel {
  fields: Question[]
  id: string
  settings: {
    description: string
    formEntryId?: number | string
    isCollapsed?: boolean
    isLocked?: boolean
    logic?: LogicRule[]
    masterFormId?: number | string | null
    title?: string
  }
}
export type PublishStatus =
  | 'DRAFT'
  | 'PUBLISHED'
  | 'PUBLISH_SCHEDULE'
  | 'UNPUBLISHED'
  | 'UNPUBLISH_SCHEDULE'

export interface Question {
  id: string
  label: string
  type: QuestionType
  displayLabel?: string
  notEditable?: boolean
  showSettingsOnly?: boolean
  settings: {
    aiSettings?: {
      fileDataValidate?: string[]
      fileValidation?: {
        classificationRules?: string
        enableClassification?: boolean
        enableExtraction?: boolean
        extractionRules?: string
      }
      formControlValidate?: {
        conditionFields?: any[]
        existingFormFields?: string[]
        formFields?: string
        masterFormColumn: any[]
        masterFormId: number
        optionsType?: string
      }
      imageFileValidate?: {
        formFields?: string[]
        optionsType?: string
      }
      // TABLE fields only: id of a FILE_UPLOAD field on the same form whose
      // OCR-extracted line items should be offered for import into this table.
      lineItemSourceFieldId?: string
      validateTypeKeyword?: string
    }
    general: {
      description?: string
      dividerType?: 'SOLID' | 'DASHED' | 'DOTTED' | 'DOUBLE' | string
      hidden?: boolean
      hideLabel: boolean
      placeholder?: string
      readOnly?: boolean
      size: QuestionWidth
      tooltip?: string
      url?: string
      visibility: 'NORMAL' | 'READ_ONLY' | 'HIDDEN' | 'DISABLE'
    }
    logic?: LogicRule[]
    lookupSettings: {
      columnName?: string
      columnNameInAPI?: string
      conditionMappings?: { fieldId: string; operator: string; value: any }[]
      connectionId?: number | string
      connectionType?: 'SQL' | 'API' | 'ORACLE' | 'GOOGLE_SHEETS' | 'SALESFORCE'
      hasLookupCondition?: boolean
      hasSameConnection?: boolean
      hasSameFunction?: boolean
      hubName?: string
      mappingField?: string
      parentField?: string
      secondaryName?: string
      syncFieldsForAPI?: Array<{ apiParam: string; formField: string }>
      valueMappings?: { source: string; target: string }[]
    }
    pipingEnabled?: boolean
    specific: {
      additionalLoginTypes?: string[]
      addressFields?: string[]
      addressMatchingFields?: Array<{
        addressColumn: 'CITY' | 'COUNTRY' | 'POSTALCODE' | 'STATE'
        id: string
        selectFieldColumn: string[]
      }>
      addressMode?: 'INTERNATIONAL' | 'SPECIFIC'
      allowCustomEntries?: boolean
      allowHalfRating?: boolean
      allowMultipleFiles?: boolean
      allowMultipleSignatures?: boolean
      allowToAddNewOptions?: boolean
      autoGenerateValue?: { enabled?: boolean; prefix: string; suffix: string }
      bulkActionsEnabled?: boolean
      childFieldType?: string
      countryCodeSearchEnabled?: boolean
      currencyOptionsType?: 'ALL' | 'SPECIFIC'
      currencyParentFieldId?: string
      customDefaultValue?: any
      customOptions?: string
      dateDefaultValueType?: 'CUSTOM' | 'TODAY' | 'PARENT_FIELD'
      decimalPrecision?: number
      defaultCountryCode?: string
      defaultValue?: string
      defaultValueInSelectField?: 'USER_EMAIL' | 'USER_NAME' | 'NONE' | string
      defaultValueType?: 'STATIC' | 'DYNAMIC' | 'NONE'
      dense?: boolean
      dividerStyle?: 'SOLID' | 'DASHED' | 'DOTTED' | 'DOUBLE'
      dividerType?: 'SOLID' | 'DASHED' | 'DOTTED' | 'DOUBLE'
      existingFieldId?: string
      fibFields?: any[]
      fibMapping?: string
      fileInStageOnly?: boolean
      fillValueType?:
        | 'ASSIGN_PARENT_FIELD'
        | 'AUTO_GENERATE'
        | 'CURRENT_YEAR'
        | 'CUSTOM'
        | 'LOGIN_NAME'
        | 'MASTER'
        | 'REQUEST_NO'
        | 'USER_EMAIL'
        | 'USER_NAME'
      fixedRowCount?: number
      formSyncField?: string[]
      formulaTokens?: {
        type: 'FIELD' | 'OPERATOR' | 'NUMBER' | 'FUNCTION' | 'TABLE_SUM'
        value: string
      }[]
      hasSameForm?: 'YES' | 'NO' | boolean
      hasYearType?: boolean
      iconCount?: number
      iconType?: 'STAR' | 'HEART' | 'SMILEY'
      importExportEnabled?: boolean
      inputMask?: string
      isAddressField?: boolean
      isCalculationEnabled?: boolean
      isInteger?: boolean
      isSameMaster?: boolean
      isSearchField?: 'YES' | 'NO'
      listUsersByGroup?: string
      loginType?: string
      lookupMaster?: string
      masterFormColumn?: string
      masterFormConditionColumn?: Array<{
        formField: string
        masterColumn: string
      }>
      masterFormId?: number | string
      masterFormParentColumn?: string
      masterFormSyncSettings?: Array<{
        formField: string
        id?: string
        masterField: string
      }>
      masterFormTableColumns?: Array<{
        id: string
        masterColumn: string
        tableColumn: string
      }>
      masterSyncField?: string
      matrixColumnLabels?: string[]
      matrixColumns?: string[]
      matrixRowLabels?: string[]
      matrixRows?: string[]
      matrixSelectionType?: 'SINGLE' | 'MULTIPLE'
      maxLevel?: number
      noLabel?: string
      opinionLabels?: { max: string; mid: string; min: string }
      optionsPerLine?: number
      optionsSource?: string
      optionsType?: string
      parentDateFieldId?: string
      parentDateOffset?: number
      parentFieldFilterValue?: any
      parentFieldId?: string
      predefinedColumn?: string
      predefinedParentColumn?: string
      predefinedType?: 'USER' | 'WORKSPACE' | 'FOLDER' | 'WORKFLOW'
      prefillFromUrl?: boolean
      prefixIcon?: string
      prefixLabel?: string
      preventNegative?: boolean
      qrCodeEnabled?: boolean
      qrValue?: boolean
      repositoryField?: string
      repositoryFieldParent?: string
      repositoryId?: string
      requireFirst?: boolean
      requireLast?: boolean
      requirePostalCode?: boolean
      requireState?: boolean
      rowSelection?: 'NONE' | 'SINGLE' | 'MULTIPLE'
      rowsType?: 'ON_DEMAND' | 'FIXED'
      searchFormId?: string | number
      separateOptionsUsing?: string
      showAllData?: boolean
      showMiddle?: boolean
      showOptionsWrapper?: boolean
      showStatusIndicator?: boolean
      showSummaryRow?: boolean
      showYesNoIcons?: boolean
      signaturePenColor?: string
      specificCurrencies?: string[]
      suffixIcon?: string
      suffixLabel?: string
      tableColumns?: Array<{
        id: string
        name: string
        settings?: {
          general?: {
            displayLabel?: string
            tooltip?: string
            visibility?: 'DISABLE' | 'NORMAL' | 'READ_ONLY'
          }
          lookupSettings?: {
            /** Id of another column in this table whose value in the same
             * row filters this column's repository-facet options (cascade). */
            cascadeFromColumn?: string
            /** LOOKUP = repository facets; API = FTL catalog on focus/select */
            optionsSource?: 'LOOKUP' | 'API'
            repositoryField?: string
            repositoryId?: string
          }
          specific?: {
            customDefaultValue?: string
            customOptions?: string
            defaultValueType?:
              | 'AUTO_SEQUENCE'
              | 'CURRENT_DATE'
              | 'CUSTOM'
              | 'USER_EMAIL'
            formulaTokens?: Array<{
              type: 'FIELD' | 'FUNCTION' | 'NUMBER' | 'OPERATOR' | 'TABLE_SUM'
              value: string
            }>
            placeholder?: string
            showColumnTotal?: boolean
          }
          validation?: {
            contentRule?: string
            fieldRule?: 'OPTIONAL' | 'REQUIRED'
            maximum?: number | string
            minimum?: number | string
          }
        }
        size: 'SMALL' | 'MEDIUM' | 'LARGE'
        type: QuestionType
      }>
      tableFixedRowLabels?: string[]
      tableViewMode?: 'ADVANCE' | 'NORMAL'
      timeDefaultValueType?: 'CUSTOM' | 'NOW' | 'NONE'
      // qrValue?: boolean
      uniqueCheck?: boolean
      variant?: 'default' | 'filled' | 'unstyled'
      yearType?: 'CALENDER_YEAR' | 'FINANCIAL_YEAR' | string
      // yearType?: 'CALENDER_YEAR' | 'FINANCIAL_YEAR'
      yesLabel?: string
      yesNoLabels?: { no: string; yes: string }
    }
    validation: {
      allowedFileTypes?: string[]
      answerIndicator?: 'NO' | 'YES'
      // Field IDs to auto-fill from this FILE_UPLOAD field's OCR extraction
      assignOtherControls?: string[]
      contentRule?: string
      correctAnswer?: string
      // Date Limits
      dateLimitType?: 'NONE' | 'MIN_DATE' | 'MAX_DATE' | 'RANGE'
      dateRange?: 'PAST' | 'FUTURE' | 'CUSTOM'
      decimalDigits?: number
      enableSettings?: Array<{
        controls?: string[]
        id?: string
        value?: string
      }>
      errorMessage?: string
      expiryFieldId?: string
      fieldRule: 'OPTIONAL' | 'REQUIRED'
      fixedEndDate?: string
      fixedEndTime?: string
      fixedStartDate?: string
      fixedStartTime?: string
      // answerIndicator?: 'YES' | 'NO'
      hasCalculatedField?: boolean
      isCalculationEnabled?: boolean
      mandatorySettings?: Array<{
        controls: string[]
        id: string
        value: string
      }>
      maxDateOffset?: number
      maxFileSize?: number
      maximum?: string | number
      maxTimeOffset?: number
      minDateOffset?: number
      minimum?: string | number
      minTimeOffset?: number
      pattern?: string
      rangeType?: 'MIN_FIXED_MAX_FLEX' | 'MIN_FLEX_MAX_FIXED' | 'CUSTOM'
      readonlySettings?: Array<{
        controls: string[]
        id: string
        notEqual?: boolean
        value: string
      }>
      requireCurrencyUnit?: boolean
      requiredValidation?: 'ANY' | 'ALL'
      // Time specific
      timeFormat?: '12' | '24'
      timeLimitType?: 'NONE' | 'MIN_TIME' | 'MAX_TIME' | 'RANGE'
      timeRange?: string
      verificationRequired?: boolean
      // verificationRequired?: boolean
    }
  }
}
export type QuestionType =
  | 'SHORT_TEXT'
  | 'LONG_TEXT'
  | 'NUMBER'
  | 'DATE'
  | 'TIME'
  | 'DATE_TIME'
  | 'SINGLE_SELECT'
  | 'MULTI_SELECT'
  | 'SINGLE_CHOICE'
  | 'MULTIPLE_CHOICE'
  | 'TABLE'
  | 'DYNAMIC_TABLE'
  | 'MATRIX'
  | 'FILL_IN_THE_BLANKS'
  | 'SIGNATURE'
  | 'FILE_UPLOAD'
  | 'CURRENCY_AMOUNT'
  | 'PHONE_NUMBER'
  | 'HEADING'
  | 'DIVIDER'
  | 'LABEL'
  | 'PARAGRAPH'
  | 'RATING'
  | 'OPINION_SCALE'
  | 'COUNTER'
  | 'CALCULATED'
  | 'COUNTRY_CODE'
  | 'ADDRESS'
  | 'FULL_NAME'
  | 'EMAIL'
  | 'PASSWORD'
  | 'TEXT_BUILDER'
  | 'URL'
  | 'YES_NO_TOGGLE'
  | 'SCORE'
  | 'IMAGE_UPLOAD'
  | 'CONSENT'
  | 'SERIAL_NUMBER'
  | 'CHIPS'
  | 'IMAGE'
  | 'JSON_EDITOR'
  | 'NESTED_LIST'
  | 'POPUP'
  | 'TABS'
  | 'LOGIN_AUTHENTICATION'
  | 'CURRENCY'

export type QuestionWidth = 'col-3' | 'col-4' | 'col-6' | 'col-12'

const MAX_HISTORY_STEPS = 50

const snapshotPanels = (panels: Panel[]): Panel[] =>
  JSON.parse(JSON.stringify(panels || []))

const pushPastHistory = (
  past: Panel[][],
  currentPanels: Panel[],
): Panel[][] => {
  const next = [...(past || []), snapshotPanels(currentPanels)]
  return next.length > MAX_HISTORY_STEPS
    ? next.slice(next.length - MAX_HISTORY_STEPS)
    : next
}

const initialState = {
  activePanelId: null,
  activeQuestionId: null,
  addFieldPosition: null,
  closedMessage: 'This form is currently closed.',
  conversationalMode: false,
  coordinator: '',
  description: '',
  entryUser: [] as string[],
  footerText: '',
  formType: 'WORKFLOW' as FormType,
  headerText: '',
  historyFuture: [] as Panel[][],
  historyPast: [] as Panel[][],
  hubLinkIds: [] as any[],
  isBuilderMode: true,
  isLeftSidebarCollapsed: false,
  isPreviewOpen: false,
  isPublishOpen: false,
  isSidebarOpen: false,
  lastAddedPanelId: null,
  layout: 'CLASSIC' as FormLayout,
  name: 'Untitled Form',
  panels: [] as Panel[],
  previewMode: 'typeform' as const,
  publishStatus: 'DRAFT' as PublishStatus,
  qrFields: [] as string[],
  rawFormRoot: {} as Record<string, any>,
  rawPublish: {} as Record<string, any>,
  rawSettings: {} as Record<string, any>,
  rawSettingsGeneral: {} as Record<string, any>,
  responseLimit: undefined,
  rules: [] as V5CalculationRule[],
  scheduleEnd: '',
  scheduleStart: '',
  secondaryPanels: [] as Panel[],
  selectionType: 'general' as const,
  showHeaderFooter: false,
  sidebarView: 'fields' as const,
  superUser: [] as string[],
  uid: '',
  uniqueColumns: [] as string[],
}

export const useFormStore = create<FormStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      uid: generateId(),

      // Field & Panel Actions
      addPanel: (index) =>
        set((state) => {
          const newPanel: Panel = {
            fields: [],
            id: generateId(),
            settings: {
              description: '',
              title: `Section ${state.panels.length + 1}`,
            },
          }
          const newPanels = [...state.panels]
          if (typeof index === 'number') {
            newPanels.splice(index, 0, newPanel)
          } else {
            newPanels.push(newPanel)
          }
          return {
            historyFuture: [],
            historyPast: pushPastHistory(state.historyPast, state.panels),
            lastAddedPanelId: newPanel.id,
            panels: newPanels,
          }
        }),

      addQuestion: (panelId, question, index) =>
        set((state) => {
          const normalized = normalizeFieldSchema(question)
          return {
            activeQuestionId: normalized.id,
            historyFuture: [],
            historyPast: pushPastHistory(state.historyPast, state.panels),
            panels: state.panels.map((p) => {
              if (p.id !== panelId) return p
              const newFields = [...p.fields]
              if (typeof index === 'number') {
                newFields.splice(index, 0, normalized)
              } else {
                newFields.push(normalized)
              }
              return { ...p, fields: newFields }
            }),
          }
        }),

      appendAIResponse: (data) =>
        set((state) => {
          if (!data || data.action === 'INFO') return state

          // Explicit whole-form wipe - only the AI action the user asked for
          // by name ("remove/clear the form") reaches this branch.
          if (data.action === 'REMOVE_FORM') {
            return {
              ...state,
              activeQuestionId: null,
              historyFuture: [],
              historyPast: pushPastHistory(state.historyPast, state.panels),
              panels: [],
              selectionType: 'general',
            }
          }

          const removedFieldIds = new Set<string>(
            Array.isArray(data.removedFieldIds) ? data.removedFieldIds : [],
          )
          const removedPanelIds = new Set<string>(
            Array.isArray(data.removedPanelIds) ? data.removedPanelIds : [],
          )
          const aiPanels: any[] = data.panels || []

          const mergeField = (existingField: Question, f: any): Question => {
            const fieldLabel = f.label || f.title || existingField.label
            const fieldType = (
              f.type ||
              existingField.type ||
              'SHORT_TEXT'
            ).toUpperCase() as QuestionType
            const isMandatory =
              f.isMandatory !== undefined
                ? f.isMandatory
                : f.settings?.validation?.fieldRule
                  ? f.settings.validation.fieldRule === 'MANDATORY' ||
                    f.settings.validation.fieldRule === 'REQUIRED'
                  : (existingField.settings?.validation
                      ?.fieldRule as string) === 'MANDATORY' ||
                    existingField.settings?.validation?.fieldRule === 'REQUIRED'

            return {
              ...existingField,
              label: fieldLabel,
              type: fieldType,
              settings: {
                ...existingField.settings,
                general: {
                  ...existingField.settings?.general,
                  placeholder:
                    f.placeholder ??
                    f.settings?.general?.placeholder ??
                    existingField.settings?.general?.placeholder ??
                    '',
                  size:
                    f.size ??
                    f.settings?.general?.size ??
                    existingField.settings?.general?.size ??
                    'col-6',
                },
                specific: {
                  ...existingField.settings?.specific,
                  customOptions: Array.isArray(f.options)
                    ? f.options.join('\n')
                    : Array.isArray(f.settings?.specific?.options)
                      ? f.settings.specific.options.join('\n')
                      : (f.settings?.specific?.customOptions ??
                        existingField.settings?.specific?.customOptions ??
                        ''),
                },
                validation: {
                  ...existingField.settings?.validation,
                  fieldRule: (isMandatory
                    ? 'REQUIRED'
                    : 'OPTIONAL') as Question['settings']['validation']['fieldRule'],
                },
              },
            }
          }

          const buildNewField = (f: any): Question => {
            const fieldLabel = f.label || f.title || 'Untitled Field'
            const fieldType = (
              f.type || 'SHORT_TEXT'
            ).toUpperCase() as QuestionType
            const baseField = getField(fieldType)
            const isMandatory = Boolean(
              f.isMandatory ||
              f.settings?.validation?.fieldRule === 'MANDATORY' ||
              f.settings?.validation?.fieldRule === 'REQUIRED',
            )

            return {
              ...baseField,
              id: f.id || baseField.id,
              label: fieldLabel,
              type: fieldType,
              settings: {
                ...baseField.settings,
                general: {
                  ...baseField.settings?.general,
                  hideLabel: f.settings?.general?.hideLabel ?? false,
                  placeholder:
                    f.placeholder || f.settings?.general?.placeholder || '',
                  size: f.size || f.settings?.general?.size || 'col-6',
                  tooltip: f.settings?.general?.tooltip || '',
                  visibility: f.settings?.general?.visibility || 'NORMAL',
                },
                specific: {
                  ...baseField.settings?.specific,
                  ...f.settings?.specific,
                  customOptions: Array.isArray(f.options)
                    ? f.options.join('\n')
                    : Array.isArray(f.settings?.specific?.options)
                      ? f.settings.specific.options.join('\n')
                      : f.settings?.specific?.customOptions || '',
                },
                validation: {
                  ...f.settings?.validation,
                  fieldRule: (isMandatory
                    ? 'REQUIRED'
                    : 'OPTIONAL') as Question['settings']['validation']['fieldRule'],
                },
              },
            }
          }

          // Fields the AI didn't mention are kept exactly as-is; only ids in
          // removedFieldIds are dropped, and unmatched AI fields are appended.
          const mergePanelFields = (
            existingFields: Question[],
            aiFields: any[],
          ): Question[] => {
            const matched = new Set<any>()

            const kept = existingFields
              .filter((ef) => !removedFieldIds.has(ef.id))
              .map((ef) => {
                const label = (ef.label || '').toLowerCase().trim()
                const match = aiFields.find(
                  (f) =>
                    !matched.has(f) &&
                    ((f.id && f.id === ef.id) ||
                      (!f.id &&
                        label &&
                        (f.label || f.title || '').toLowerCase().trim() ===
                          label)),
                )
                if (!match) return ef
                matched.add(match)
                return mergeField(ef, match)
              })

            const added = aiFields
              .filter(
                (f) => !matched.has(f) && !(f.id && removedFieldIds.has(f.id)),
              )
              .map(buildNewField)

            return [...kept, ...added]
          }

          const findAiPanel = (existingPanel: Panel) => {
            const title = (
              existingPanel.settings?.title ||
              (existingPanel as any).title ||
              ''
            )
              .toLowerCase()
              .trim()
            return aiPanels.find(
              (p) =>
                (existingPanel.id && p.id && p.id === existingPanel.id) ||
                (!p.id &&
                  title &&
                  (p.settings?.title || p.title || '').toLowerCase().trim() ===
                    title),
            )
          }

          const matchedAiPanels = new Set<any>()

          // Sections the AI didn't mention are kept exactly as-is; only ids in
          // removedPanelIds are dropped.
          const mergedExistingPanels = state.panels
            .filter((p) => !removedPanelIds.has(p.id))
            .map((p) => {
              const match = findAiPanel(p)
              if (!match) return p
              matchedAiPanels.add(match)

              return {
                ...p,
                fields: mergePanelFields(p.fields, match.fields || []),
                settings: {
                  ...p.settings,
                  description:
                    match.settings?.description ??
                    match.description ??
                    p.settings?.description ??
                    '',
                  title:
                    match.settings?.title || match.title || p.settings?.title,
                },
              }
            })

          const newPanels = aiPanels
            .filter(
              (p) =>
                !matchedAiPanels.has(p) && !(p.id && removedPanelIds.has(p.id)),
            )
            .map((p) => ({
              fields: (p.fields || []).map(buildNewField),
              id: p.id || generateId(),
              settings: {
                description: p.settings?.description || p.description || '',
                title: p.settings?.title || p.title || 'Untitled Section',
              },
            }))

          return {
            ...state,
            activeQuestionId: null,
            description: data.description || state.description,
            formType: data.formType || state.formType,
            historyFuture: [],
            historyPast: pushPastHistory(state.historyPast, state.panels),
            layout: data.layout || state.layout,
            name: data.name || state.name,
            panels: [...mergedExistingPanels, ...newPanels],
            selectionType: 'general',
          }
        }),

      clearLastAddedPanelId: () => set({ lastAddedPanelId: null }),

      clearSelection: () =>
        set({ activeQuestionId: null, selectionType: 'general' }),

      deletePanel: (id) =>
        set((state) => ({
          historyFuture: [],
          historyPast: pushPastHistory(state.historyPast, state.panels),
          panels: state.panels.filter((p) => p.id !== id),
        })),

      deleteQuestion: (id) =>
        set((state) => ({
          activeQuestionId:
            state.activeQuestionId === id ? null : state.activeQuestionId,
          historyFuture: [],
          historyPast: pushPastHistory(state.historyPast, state.panels),
          panels: state.panels.map((p) => ({
            ...p,
            fields: p.fields.filter((f) => f.id !== id),
          })),
        })),

      duplicatePanel: (id: string) =>
        set((state) => {
          const index = state.panels.findIndex((p) => p.id === id)
          if (index === -1) return state
          const original = state.panels[index]
          const clone: Panel = clonePanelWithNewIds(original)
          const newPanels = [...state.panels]
          newPanels.splice(index + 1, 0, clone)
          return {
            historyFuture: [],
            historyPast: pushPastHistory(state.historyPast, state.panels),
            panels: newPanels,
          }
        }),

      duplicateQuestion: (id) =>
        set((state) => {
          const newPanels = state.panels.map((p) => {
            const index = p.fields.findIndex((f) => f.id === id)
            if (index === -1) return p
            const clone = cloneFieldWithNewIds(p.fields[index])
            const newFields = [...p.fields]
            newFields.splice(index + 1, 0, clone)
            return { ...p, fields: newFields }
          })
          return {
            historyFuture: [],
            historyPast: pushPastHistory(state.historyPast, state.panels),
            panels: newPanels,
          }
        }),

      // Lifecycle Actions
      loadForm: (data: any) => {
        if (!data) return

        let json = data.formJson || data

        // If it's a string, attempt to parse it
        if (typeof json === 'string') {
          try {
            json = JSON.parse(json)
          } catch (e) {
            console.error('Failed to parse formJson in loadForm:', e)
            return
          }
        }

        // Validate that we have some valid form structure
        if (!json || (!json.panels && !json.settings)) return

        const normalized = normalizeV5FormJson(json)
        const genSettings = normalized.settings?.general || {}
        const pubSettings = normalized.settings?.publish || {}

        const validFormTypes = [
          'WORKFLOW',
          'FEEDBACK',
          'MASTER',
          'TASK',
          'SLA',
          'Feedback Form',
        ]
        const resolvedFormType: FormType = validFormTypes.includes(
          genSettings.type,
        )
          ? genSettings.type
          : 'WORKFLOW'

        const superUser = Array.isArray(genSettings.superUser)
          ? genSettings.superUser
          : genSettings.coordinator
            ? [genSettings.coordinator]
            : []

        set({
          activeQuestionId: null,
          closedMessage:
            genSettings.closedMessage ?? 'This form is currently closed.',
          conversationalMode: Boolean(genSettings.conversationalMode),
          coordinator:
            genSettings.coordinator ||
            (Array.isArray(genSettings.superUser) &&
            genSettings.superUser.length > 0
              ? String(genSettings.superUser[0])
              : ''),
          description: genSettings.description || data.description || '',
          entryUser: Array.isArray(genSettings.entryUser)
            ? genSettings.entryUser
            : [],
          footerText: genSettings.footerText || '',
          formType: resolvedFormType,
          headerText: genSettings.headerText || '',
          historyFuture: [],
          historyPast: [],
          hubLinkIds: normalized.settings?.hubLinkIds || [],
          isPreviewOpen: false,
          isPublishOpen: false,
          isSidebarOpen: false,
          layout: mapV5LayoutToV6(genSettings.layout),
          name: genSettings.name || data.name || 'Untitled Form',
          panels: normalized.panels || [],
          publishStatus: (() => {
            const raw =
              data?.publishOption ||
              data?.status ||
              pubSettings?.publishOption ||
              'DRAFT'
            const str = String(raw).toUpperCase()
            if (
              str === 'PUBLISHED' ||
              str === 'PUBLISH_SCHEDULE' ||
              str === 'UNPUBLISHED' ||
              str === 'UNPUBLISH_SCHEDULE' ||
              str === 'DRAFT'
            ) {
              return str as PublishStatus
            }
            return raw === 1 || raw === '1' ? 'PUBLISHED' : 'DRAFT'
          })(),
          qrFields: Array.isArray(genSettings.qrFields)
            ? genSettings.qrFields
            : [],
          rawFormRoot: normalized.rawFormRoot || {},
          rawPublish: { ...pubSettings },
          rawSettings: normalized.rawSettings || {},
          rawSettingsGeneral: { ...genSettings },
          responseLimit: genSettings.responseLimit,
          rules: normalized.rules || [],
          scheduleEnd: pubSettings.unpublishSchedule || '',
          scheduleStart: pubSettings.publishSchedule || '',
          secondaryPanels: normalized.secondaryPanels || [],
          showHeaderFooter: Boolean(genSettings.showHeaderFooter),
          superUser,
          uid: data.uid || json.uid || generateId(),
          uniqueColumns: Array.isArray(genSettings.uniqueColumns)
            ? genSettings.uniqueColumns
            : [],
        })
      },

      movePanel: (id, direction) =>
        set((state) => {
          const index = state.panels.findIndex((p) => p.id === id)
          if (index === -1) return state
          const newPanels = [...state.panels]
          const newIndex = direction === 'up' ? index - 1 : index + 1
          if (newIndex < 0 || newIndex >= newPanels.length) return state
          const [moved] = newPanels.splice(index, 1)
          newPanels.splice(newIndex, 0, moved)
          return {
            historyFuture: [],
            historyPast: pushPastHistory(state.historyPast, state.panels),
            panels: newPanels,
          }
        }),
      moveQuestion: (id, toPanelId, index) =>
        set((state) => {
          let questionToMove: Question | undefined
          const panelsWithout = state.panels.map((p) => {
            const q = p.fields.find((f) => f.id === id)
            if (q) {
              questionToMove = q
              return { ...p, fields: p.fields.filter((f) => f.id !== id) }
            }
            return p
          })
          if (!questionToMove) return state
          return {
            historyFuture: [],
            historyPast: pushPastHistory(state.historyPast, state.panels),
            panels: panelsWithout.map((p) => {
              if (p.id !== toPanelId) return p
              const newFields = [...p.fields]
              newFields.splice(index, 0, questionToMove!)
              return { ...p, fields: newFields }
            }),
          }
        }),

      redo: () =>
        set((state) => {
          if (!state.historyFuture || state.historyFuture.length === 0) {
            return state
          }
          const [nextPanels, ...remainingFuture] = state.historyFuture
          return {
            historyFuture: remainingFuture,
            historyPast: pushPastHistory(state.historyPast, state.panels),
            panels: snapshotPanels(nextPanels),
          }
        }),

      resetForm: () => set({ ...initialState, uid: generateId() }),
      saveForm: async (targetStatus, formId) => {
        const state = get()
        const currentStatus = targetStatus || state.publishStatus
        const isPublished = String(currentStatus).toUpperCase() === 'PUBLISHED'

        set({ publishStatus: isPublished ? 'PUBLISHED' : 'DRAFT' })

        const formSchema = cleanFormPayload({
          ...state,
          publishStatus: isPublished ? 'PUBLISHED' : 'DRAFT',
        })

        const payload = {
          description: state.description || '',
          formJson: formSchema,
          name: state.name || 'Untitled Form',
          status: isPublished ? 'PUBLISHED' : 'DRAFT',
        }

        console.log(
          '📌 [Form Builder] Saving Form JSON Payload:',
          JSON.stringify(payload, null, 2),
        )
        console.log('📌 [Form Builder] Raw Form JSON object:', formSchema)

        const hasFields = state.panels.some((p) => p.fields.length > 0)
        if (!hasFields) {
          notifications.show({
            color: 'orange',
            message:
              'Please add at least one field to your form before saving.',
            title: 'Empty Form',
          })
          return { success: false }
        }

        try {
          const response = formId
            ? await formApi.updateForm(formId, payload)
            : await formApi.createForm(payload)

          if (response.error) {
            notifications.show({
              color: 'red',
              message: response.error,
              title: 'Error Saving Form',
            })
            return { success: false }
          }

          notifications.show({
            color: 'teal',
            message: `Your form has been ${currentStatus === 'PUBLISHED' ? 'published' : 'saved'} successfully.`,
            title: 'Success!',
          })

          const createdFormId = formId
            ? undefined
            : (response.data?.id ??
              response.data?.formId ??
              (typeof response.data === 'string' ? response.data : undefined))

          return { createdFormId, success: true }
        } catch {
          notifications.show({
            color: 'red',
            message: 'An unexpected error occurred while saving.',
            title: 'Unexpected Error',
          })
          return { success: false }
        }
      },
      undo: () =>
        set((state) => {
          if (!state.historyPast || state.historyPast.length === 0) {
            return state
          }
          const previousPanels = state.historyPast[state.historyPast.length - 1]
          const remainingPast = state.historyPast.slice(0, -1)
          return {
            historyFuture: [
              snapshotPanels(state.panels),
              ...(state.historyFuture || []),
            ].slice(0, MAX_HISTORY_STEPS),
            historyPast: remainingPast,
            panels: snapshotPanels(previousPanels),
          }
        }),
      updatePanel: (id, updates) =>
        set((state) => ({
          historyFuture: [],
          historyPast: pushPastHistory(state.historyPast, state.panels),
          panels: state.panels.map((p) =>
            p.id === id ? { ...p, settings: { ...p.settings, ...updates } } : p,
          ),
        })),
      updateQuestion: (id, updates) =>
        set((state) => ({
          historyFuture: [],
          historyPast: pushPastHistory(state.historyPast, state.panels),
          panels: state.panels.map((p) => ({
            ...p,
            fields: p.fields.map((f) => {
              if (f.id !== id) return f
              const nextField =
                typeof updates === 'function'
                  ? updates(f)
                  : { ...f, ...updates }
              return normalizeFieldSchema(nextField, 'save')
            }),
          })),
        })),
      setActivePanelId: (activePanelId) => set({ activePanelId }),

      // UI Selection Actions
      setActiveQuestionId: (activeQuestionId) => set({ activeQuestionId }),
      setAddFieldPosition: (addFieldPosition) => set({ addFieldPosition }),
      setClosedMessage: (closedMessage) => set({ closedMessage }),
      setConversationalMode: (conversationalMode) =>
        set({ conversationalMode }),
      setCoordinator: (coordinator) =>
        set((state) => ({
          coordinator,
          superUser: coordinator
            ? Array.from(new Set([coordinator, ...(state.superUser || [])]))
            : state.superUser,
        })),
      setDescription: (description) => set({ description }),
      setEntryUser: (entryUser) => set({ entryUser }),
      // Fix V5 Bug 5: Preserve superUser and entryUser when switching formType
      setFormType: (formType) =>
        set((state) => ({
          entryUser: state.entryUser,
          formType,
          superUser: state.superUser,
        })),
      setHeaderFooter: (updates) =>
        set((state) => ({
          footerText: updates.footer ?? state.footerText,
          headerText: updates.header ?? state.headerText,
          showHeaderFooter: updates.show ?? state.showHeaderFooter,
        })),
      setIsBuilderMode: (isBuilderMode) => set({ isBuilderMode }),
      setIsPreviewOpen: (isPreviewOpen) => set({ isPreviewOpen }),

      setLayout: (layout) => set({ layout }),
      setLeftSidebarCollapsed: (isLeftSidebarCollapsed) =>
        set({ isLeftSidebarCollapsed }),
      // Form Metadata Actions
      setName: (name) => set({ name }),
      setPanels: (panels) =>
        set((state) => ({
          historyFuture: [],
          historyPast: pushPastHistory(state.historyPast, state.panels),
          panels,
        })),
      setPreviewMode: (previewMode) => set({ previewMode }),

      setPublishOpen: (isPublishOpen) => set({ isPublishOpen }),
      setPublishStatus: (publishStatus) => set({ publishStatus }),
      setQrFields: (qrFields) => set({ qrFields }),
      // Management Actions
      setResponseLimit: (responseLimit) => set({ responseLimit }),

      setRules: (rules) => set({ rules }),
      setSchedule: (scheduleStart, scheduleEnd) =>
        set({
          scheduleEnd: scheduleEnd ?? '',
          scheduleStart: scheduleStart ?? '',
        }),
      setSelectionType: (selectionType) => set({ selectionType }),
      // Sidebar Actions
      setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),

      setSidebarView: (sidebarView) => set({ sidebarView }),

      setSuperUser: (superUser) =>
        set((state) => ({
          coordinator: superUser[0] ?? state.coordinator,
          superUser,
        })),

      setUniqueColumns: (uniqueColumns) => set({ uniqueColumns }),
    }),
    {
      name: 'form-builder-storage-v3',
      version: 3,
      partialize: (state) => {
        // Exclude transient UI drawer flags and undo/redo stacks from localStorage persistence
        const {
          activePanelId: _activePanelId,
          activeQuestionId: _activeQuestionId,
          addFieldPosition: _addFieldPosition,
          historyFuture: _historyFuture,
          historyPast: _historyPast,
          isPreviewOpen: _isPreviewOpen,
          isPublishOpen: _isPublishOpen,
          isSidebarOpen: _isSidebarOpen,
          ...rest
        } = state
        return rest
      },
    },
  ),
)

export const cleanField = (field: Question) => serializeFieldForSave(field)

export const cleanFormPayload = (state: any) => serializeFormPayload(state)
