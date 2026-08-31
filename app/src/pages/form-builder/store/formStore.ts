import { notifications } from '@mantine/notifications'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import formApi from '@/api/form/form'
import { getField } from '@/helpers/new-field'

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
  footerText: string
  formType: FormType
  headerText: string
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
  secondaryPanels: Panel[]
  selectionType: 'general' | 'question'
  showHeaderFooter: boolean
  sidebarView: 'explorer' | 'fields'
  uid: string
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
  resetForm: () => void
  saveForm: (
    targetStatus?: PublishStatus,
    formId?: string,
  ) => Promise<{ createdFormId?: string; success: boolean }>
  updatePanel: (id: string, updates: Partial<Panel['settings']>) => void
  updateQuestion: (id: string, updates: any) => void
  setActivePanelId: (id: string | null) => void
  setActiveQuestionId: (id: string | null) => void
  setAddFieldPosition: (pos: { index: number; panelId: string } | null) => void
  setClosedMessage: (message: string) => void
  setConversationalMode: (enabled: boolean) => void
  setCoordinator: (coordinator: string) => void
  setDescription: (description: string) => void
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
  setResponseLimit: (limit: number | undefined) => void
  setSchedule: (start?: string, end?: string) => void
  setSelectionType: (type: 'general' | 'question') => void
  setSidebarOpen: (open: boolean) => void
  setSidebarView: (view: 'explorer' | 'fields') => void
}

export type FormType = 'WORKFLOW' | 'FEEDBACK' | 'MASTER'

export interface LogicRule {
  action: 'SHOW' | 'HIDE'
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
    isCollapsed?: boolean
    isLocked?: boolean
    title?: string
  }
}
export type PublishStatus = 'DRAFT' | 'PUBLISHED'

export interface Question {
  id: string
  label: string
  type: QuestionType
  displayLabel?: string
  settings: {
    aiSettings?: {
      fileValidation?: {
        classificationRules?: string
        enableClassification?: boolean
        enableExtraction?: boolean
        extractionRules?: string
      }
      formControlValidate?: {
        conditionFields?: string[]
        masterFormColumn: any[]
        masterFormId: number
      }
      // TABLE fields only: id of a FILE_UPLOAD field on the same form whose
      // OCR-extracted line items should be offered for import into this table.
      lineItemSourceFieldId?: string
      validateTypeKeyword?: string
    }
    general: {
      description?: string
      hidden?: boolean
      hideLabel: boolean
      placeholder?: string
      readOnly?: boolean
      size: QuestionWidth
      tooltip?: string
      url?: string
      visibility: 'NORMAL' | 'READ_ONLY' | 'HIDDEN'
    }
    logic?: LogicRule[]
    lookupSettings: {
      columnName?: string
      conditionMappings?: { fieldId: string; operator: string; value: any }[]
      connectionId?: number
      connectionType?: 'SQL' | 'API' | 'ORACLE' | 'GOOGLE_SHEETS'
      hubName?: string
      valueMappings?: { source: string; target: string }[]
    }
    pipingEnabled?: boolean
    specific: {
      addressFields?: string[]
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
      defaultValueType?: 'STATIC' | 'DYNAMIC' | 'NONE'
      dense?: boolean
      dividerStyle?: 'SOLID' | 'DASHED' | 'DOTTED' | 'DOUBLE'
      dividerType?: 'SOLID' | 'DASHED' | 'DOTTED' | 'DOUBLE'
      fibFields?: any[]
      fibMapping?: string
      fileInStageOnly?: boolean
      fixedRowCount?: number
      formulaTokens?: {
        type: 'FIELD' | 'OPERATOR' | 'NUMBER' | 'FUNCTION' | 'TABLE_SUM'
        value: string
      }[]
      iconCount?: number
      iconType?: 'STAR' | 'HEART' | 'SMILEY'
      importExportEnabled?: boolean
      inputMask?: string
      isCalculationEnabled?: boolean
      isInteger?: boolean
      lookupMaster?: string
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
      prefillFromUrl?: boolean
      prefixIcon?: string
      prefixLabel?: string
      preventNegative?: boolean
      qrCodeEnabled?: boolean
      repositoryField?: string
      repositoryId?: string
      requireFirst?: boolean
      requireLast?: boolean
      requirePostalCode?: boolean
      requireState?: boolean
      rowSelection?: 'NONE' | 'SINGLE' | 'MULTIPLE'
      rowsType?: 'ON_DEMAND' | 'FIXED'
      separateOptionsUsing?: string
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
          lookupSettings?: {
            repositoryField?: string
            repositoryId?: string
          }
          specific?: {
            customOptions?: string
            formulaTokens?: Array<{
              type: 'FIELD' | 'OPERATOR' | 'NUMBER' | 'FUNCTION'
              value: string
            }>
            placeholder?: string
          }
          validation?: { fieldRule?: 'OPTIONAL' | 'REQUIRED' }
        }
        size: 'SMALL' | 'MEDIUM' | 'LARGE'
        type: QuestionType
      }>
      timeDefaultValueType?: 'CUSTOM' | 'NOW' | 'NONE'
      uniqueCheck?: boolean
      variant?: 'default' | 'filled' | 'unstyled'
      yesLabel?: string
      yesNoLabels?: { no: string; yes: string }
    }
    validation: {
      allowedFileTypes?: string[]
      // Field IDs to auto-fill from this FILE_UPLOAD field's OCR extraction
      assignOtherControls?: string[]
      contentRule?: string
      correctAnswer?: string
      // Date Limits
      dateLimitType?: 'NONE' | 'MIN_DATE' | 'MAX_DATE' | 'RANGE'
      dateRange?: 'PAST' | 'FUTURE' | 'CUSTOM'
      decimalDigits?: number
      errorMessage?: string
      expiryFieldId?: string
      fieldRule: 'OPTIONAL' | 'REQUIRED'
      fixedEndDate?: string
      fixedEndTime?: string
      fixedStartDate?: string
      fixedStartTime?: string
      isCalculationEnabled?: boolean
      maxDateOffset?: number
      maxFileSize?: number
      maximum?: string | number
      maxTimeOffset?: number
      minDateOffset?: number
      minimum?: string | number
      minTimeOffset?: number
      pattern?: string
      rangeType?: 'MIN_FIXED_MAX_FLEX' | 'MIN_FLEX_MAX_FIXED' | 'CUSTOM'
      requireCurrencyUnit?: boolean
      requiredValidation?: 'ANY' | 'ALL'
      // Time specific
      timeFormat?: '12' | '24'
      timeLimitType?: 'NONE' | 'MIN_TIME' | 'MAX_TIME' | 'RANGE'
      timeRange?: string
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

// export type FormLayout = 'typeform' | 'grid' | 'full'
// export type FormType = 'WORKFLOW' | 'FEEDBACK' | 'MASTER'
// export type PublishStatus = 'DRAFT' | 'PUBLISHED'

export type QuestionWidth = 'col-3' | 'col-4' | 'col-6' | 'col-12'

const initialState = {
  activePanelId: null,
  activeQuestionId: null,
  addFieldPosition: null,
  closedMessage: 'This form is currently closed.',
  conversationalMode: false,
  coordinator: '',
  description: '',
  footerText: '',
  formType: 'WORKFLOW' as const,
  headerText: '',
  hubLinkIds: [],
  isBuilderMode: true,
  isLeftSidebarCollapsed: false,
  isPreviewOpen: false,
  isPublishOpen: false,
  isSidebarOpen: false,
  lastAddedPanelId: null,
  layout: 'typeform' as const,
  name: 'Untitled Form',
  panels: [],
  previewMode: 'typeform' as const,
  publishStatus: 'DRAFT' as const,
  responseLimit: undefined,
  scheduleEnd: '',
  scheduleStart: '',
  secondaryPanels: [],
  selectionType: 'general' as const,
  showHeaderFooter: false,
  sidebarView: 'fields' as const,
  uid: '',
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
          return { lastAddedPanelId: newPanel.id, panels: newPanels }
        }),

      addQuestion: (panelId, question, index) =>
        set((state) => ({
          activeQuestionId: question.id,
          panels: state.panels.map((p) => {
            if (p.id !== panelId) return p
            const newFields = [...p.fields]
            if (typeof index === 'number') {
              newFields.splice(index, 0, question)
            } else {
              newFields.push(question)
            }
            return { ...p, fields: newFields }
          }),
        })),

      appendAIResponse: (data) =>
        set((state) => {
          if (!data || data.action === 'INFO') return state

          // Explicit whole-form wipe - only the AI action the user asked for
          // by name ("remove/clear the form") reaches this branch.
          if (data.action === 'REMOVE_FORM') {
            return {
              ...state,
              activeQuestionId: null,
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
                  ? f.settings.validation.fieldRule === 'MANDATORY'
                  : (existingField.settings?.validation
                      ?.fieldRule as string) === 'MANDATORY'

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
                    ? 'MANDATORY'
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
              f.settings?.validation?.fieldRule === 'MANDATORY',
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
                  fieldRule: (isMandatory
                    ? 'MANDATORY'
                    : 'OPTIONAL') as Question['settings']['validation']['fieldRule'],
                  ...f.settings?.validation,
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
          panels: state.panels.filter((p) => p.id !== id),
        })),

      deleteQuestion: (id) =>
        set((state) => ({
          activeQuestionId:
            state.activeQuestionId === id ? null : state.activeQuestionId,
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
          const clone: Panel = {
            ...JSON.parse(JSON.stringify(original)),
            fields: original.fields.map((f) => ({
              ...f,
              id: generateId(),
              label: `${f.label} (Copy)`,
            })),
            id: generateId(),
          }
          const newPanels = [...state.panels]
          newPanels.splice(index + 1, 0, clone)
          return { panels: newPanels }
        }),

      duplicateQuestion: (id) =>
        set((state) => {
          const newPanels = state.panels.map((p) => {
            const index = p.fields.findIndex((f) => f.id === id)
            if (index === -1) return p
            const clone = {
              ...p.fields[index],
              id: generateId(),
              label: `${p.fields[index].label} (Copy)`,
            }
            const newFields = [...p.fields]
            newFields.splice(index + 1, 0, clone)
            return { ...p, fields: newFields }
          })
          return { panels: newPanels }
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

        const genSettings = json.settings?.general || {}

        set({
          activeQuestionId: null,
          coordinator: genSettings.coordinator || '',
          description: genSettings.description || '',
          formType: ['WORKFLOW', 'FEEDBACK', 'MASTER'].includes(
            genSettings.type,
          )
            ? genSettings.type
            : 'WORKFLOW',
          hubLinkIds: json.settings?.hubLinkIds || [],
          isPreviewOpen: false,
          isPublishOpen: false,
          isSidebarOpen: false,
          layout: (() => {
            const l = String(genSettings.layout || 'CLASSIC').toUpperCase()
            if (l === 'TYPEFORM' || l === 'STEPPER' || l === 'SINGLE')
              return 'SINGLE'
            if (l === 'GRID' || l === 'CLASSIC') return 'CLASSIC'
            if (l === 'FULL' || l === 'ACCORDION') return 'ACCORDION'
            return 'CLASSIC'
          })(),
          name: genSettings.name || 'Untitled Form',
          panels: json.panels || [],
          publishStatus: (() => {
            const raw =
              data?.publishOption ||
              data?.status ||
              json.settings?.publish?.publishOption
            const str = String(raw).toUpperCase()
            return str === 'PUBLISHED' || raw === 1 || raw === '1'
              ? 'PUBLISHED'
              : 'DRAFT'
          })(),
          secondaryPanels: json.secondaryPanels || [],
          uid: data.uid || json.uid || generateId(),
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
          return { panels: newPanels }
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
            panels: panelsWithout.map((p) => {
              if (p.id !== toPanelId) return p
              const newFields = [...p.fields]
              newFields.splice(index, 0, questionToMove!)
              return { ...p, fields: newFields }
            }),
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
        } catch (error) {
          notifications.show({
            color: 'red',
            message: 'An unexpected error occurred while saving.',
            title: 'Unexpected Error',
          })
          return { success: false }
        }
      },
      updatePanel: (id, updates) =>
        set((state) => ({
          panels: state.panels.map((p) =>
            p.id === id
              ? { ...p, settings: { ...(p.settings || {}), ...updates } }
              : p,
          ),
        })),

      updateQuestion: (id, updates) =>
        set((state) => ({
          panels: state.panels.map((p) => ({
            ...p,
            fields: p.fields.map((f) => {
              if (f.id !== id) return f
              if (typeof updates === 'function') return updates(f)
              return { ...f, ...updates }
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
      setCoordinator: (coordinator) => set({ coordinator }),
      setDescription: (description) => set({ description }),
      setFormType: (formType) => set({ formType }),
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

      setPanels: (panels) => set({ panels }),
      setPreviewMode: (previewMode) => set({ previewMode }),
      setPublishOpen: (isPublishOpen) => set({ isPublishOpen }),
      setPublishStatus: (publishStatus) => set({ publishStatus }),

      // Management Actions
      setResponseLimit: (responseLimit) => set({ responseLimit }),
      setSchedule: (scheduleStart, scheduleEnd) =>
        set({ scheduleEnd, scheduleStart }),
      setSelectionType: (selectionType) => set({ selectionType }),

      // Sidebar Actions
      setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
      setSidebarView: (sidebarView) => set({ sidebarView }),
    }),
    {
      name: 'form-builder-storage-v3',
      version: 3,
      partialize: (state) => {
        // Exclude transient UI drawer flags from localStorage persistence
        const {
          activePanelId,
          activeQuestionId,
          addFieldPosition,
          isPreviewOpen,
          isPublishOpen,
          isSidebarOpen,
          ...rest
        } = state
        return rest
      },
    },
  ),
)

export const cleanField = (field: Question) => {
  const cleaned = JSON.parse(JSON.stringify(field))
  const keysToRemove = [
    'filterBy',
    'filter',
    'filters',
    'isManualChange',
    'lookupFilterBy',
    'lookupFilter',
  ]
  keysToRemove.forEach((key) => delete (cleaned as any)[key])
  return cleaned
}

export const cleanFormPayload = (state: any) => {
  return {
    isDeleted: false,
    panels: state.panels.map((p: any) => ({
      ...p,
      fields: p.fields.map((f: any) => cleanField(f)),
    })),
    secondaryPanels: state.secondaryPanels.map((p: any) => ({
      ...p,
      fields: p.fields.map((f: any) => cleanField(f)),
    })),
    uid: state.uid,
    settings: {
      general: {
        coordinator: state.coordinator,
        description: state.description,
        layout: state.layout,
        name: state.name,
        type: state.formType,
      },

      hubLinkIds: state.hubLinkIds,
      publish: {
        publishOption: state.publishStatus,
        publishSchedule: '',
        unpublishSchedule: '',
      },
      rules: [],
    },
  }
}
