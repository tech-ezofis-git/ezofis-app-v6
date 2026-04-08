import { notifications } from '@mantine/notifications'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import formApi from '@/api/form/form'

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

export type FormLayout = 'typeform' | 'grid' | 'full'

export interface FormStore {
  activeQuestionId: string | null
  conversationalMode: boolean
  coordinator: string
  copiedQuestion: Question | null
  description: string
  footerText: string
  formType: FormType
  headerText: string
  hubLinkIds: any[]
  isBuilderMode: boolean
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
  selectionType: 'general' | 'question' | 'welcome' | 'thank_you'
  showHeaderFooter: boolean
  showThankYouPage: boolean
  showWelcomePage: boolean
  welcomePage: WelcomePageSettings
  thankYouPage: WelcomePageSettings
  isLeftSidebarCollapsed: boolean
  sidebarView: 'explorer' | 'fields'
  addFieldPosition: { panelId: string, index: number } | null
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
  duplicateQuestion: (id: string) => void
  loadForm: (data: any) => void
  movePanel: (id: string, direction: 'up' | 'down') => void
  moveQuestion: (id: string, toPanelId: string, index: number) => void
  pasteQuestion: (panelId: string, index: number) => void
  resetForm: () => void
  saveForm: (targetStatus?: PublishStatus) => Promise<boolean>
  updatePanel: (id: string, updates: Partial<Panel['settings']>) => void
  updateQuestion: (id: string, updates: any) => void
  setActiveQuestionId: (id: string | null) => void
  setClosedMessage: (message: string) => void
  setConversationalMode: (enabled: boolean) => void
  setCoordinator: (coordinator: string) => void
  // Actions
  setCopiedQuestion: (question: Question | null) => void
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
  setName: (name: string) => void
  setPanels: (panels: Panel[]) => void
  setPreviewMode: (mode: 'typeform' | 'grid' | 'full') => void
  setPublishOpen: (open: boolean) => void
  setPublishStatus: (status: PublishStatus) => void
  setResponseLimit: (limit: number | undefined) => void
  setSchedule: (start?: string, end?: string) => void
  setSelectionType: (
    type: 'general' | 'question' | 'welcome' | 'thank_you',
  ) => void
  setShowThankYouPage: (show: boolean) => void
  setShowWelcomePage: (show: boolean) => void
  setSidebarOpen: (open: boolean) => void
  setThankYouPage: (updates: Partial<WelcomePageSettings>) => void
  setWelcomePage: (updates: Partial<WelcomePageSettings>) => void
  setLeftSidebarCollapsed: (collapsed: boolean) => void
  setSidebarView: (view: 'explorer' | 'fields') => void
  setAddFieldPosition: (pos: { panelId: string, index: number } | null) => void
  duplicatePanel: (id: string) => void
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
    specific: {
      defaultValue?: string
      customDefaultValue?: any
      optionsType?: string
      optionsSource?: string
      dividerType?: 'SOLID' | 'DASHED' | 'DOTTED' | 'DOUBLE'
      dividerStyle?: 'SOLID' | 'DASHED' | 'DOTTED' | 'DOUBLE'
      customOptions?: string
      separateOptionsUsing?: string
      allowToAddNewOptions?: boolean
      optionsPerLine?: number
      tableColumns?: Array<{ id: string; name: string; type: QuestionType; size: 'SMALL' | 'MEDIUM' | 'LARGE' }>
      rowsType?: 'ON_DEMAND' | 'FIXED'
      fixedRowCount?: number
      rowSelection?: 'NONE' | 'SINGLE' | 'MULTIPLE'
      importExportEnabled?: boolean
      showSummaryRow?: boolean
      matrixColumns?: string[]
      matrixRows?: string[]
      matrixRowLabels?: string[]
      matrixColumnLabels?: string[]
      matrixSelectionType?: 'SINGLE' | 'MULTIPLE'
      opinionLabels?: { min: string; mid: string; max: string }
      addressFields?: string[]
      addressMode?: 'INTERNATIONAL' | 'SPECIFIC'
      requireState?: boolean
      requirePostalCode?: boolean
      yesNoLabels?: { yes: string; no: string }
      yesLabel?: string
      noLabel?: string
      showYesNoIcons?: boolean
      signaturePenColor?: string
      allowMultipleSignatures?: boolean
      fibFields?: any[]
      fibMapping?: string
      autoGenerateValue?: { enabled?: boolean, prefix: string, suffix: string }
      childFieldType?: string
      columns?: any[]
      lookupMaster?: string
      prefixIcon?: string
      suffixIcon?: string
      inputMask?: string
      dense?: boolean
      variant?: 'default' | 'filled' | 'unstyled'
      prefillFromUrl?: boolean
      uniqueCheck?: boolean
      showStatusIndicator?: boolean
      prefixLabel?: string
      suffixLabel?: string
      requireFirst?: boolean
      requireLast?: boolean
      showMiddle?: boolean
      dateDefaultValueType?: 'CUSTOM' | 'TODAY' | 'PARENT_FIELD'
      parentDateFieldId?: string
      parentDateOffset?: number
      timeDefaultValueType?: 'CUSTOM' | 'NOW' | 'NONE'
      parentFieldId?: string
      parentFieldFilterValue?: any
      defaultValueType?: 'STATIC' | 'DYNAMIC' | 'NONE'
      allowCustomEntries?: boolean
      bulkActionsEnabled?: boolean
      currencyOptionsType?: 'ALL' | 'SPECIFIC'
      specificCurrencies?: string[]
      currencyParentFieldId?: string
      decimalPrecision?: number
      isInteger?: boolean
      preventNegative?: boolean
      showOptionsWrapper?: boolean
      formulaTokens?: { type: 'FIELD' | 'OPERATOR' | 'NUMBER' | 'FUNCTION', value: string }[]
      isCalculationEnabled?: boolean
      defaultCountryCode?: string
      countryCodeSearchEnabled?: boolean
      qrCodeEnabled?: boolean
      fileInStageOnly?: boolean
      allowMultipleFiles?: boolean
      iconType?: 'STAR' | 'HEART' | 'SMILEY'
      iconCount?: number
      allowHalfRating?: boolean
      maxLevel?: number
    }
    validation: {
      fieldRule: 'OPTIONAL' | 'REQUIRED'
      contentRule?: string
      decimalDigits?: number
      rangeType?: 'MIN_FIXED_MAX_FLEX' | 'MIN_FLEX_MAX_FIXED' | 'CUSTOM'
      minimum?: string | number
      maximum?: string | number
      allowedFileTypes?: string[]
      maxFileSize?: number
      expiryFieldId?: string
      dateRange?: 'PAST' | 'FUTURE' | 'CUSTOM'
      // Date Limits
      dateLimitType?: 'NONE' | 'MIN_DATE' | 'MAX_DATE' | 'RANGE'
      minDateOffset?: number
      maxDateOffset?: number
      fixedStartDate?: string
      fixedEndDate?: string
      // Time specific
      timeFormat?: '12' | '24'
      requireCurrencyUnit?: boolean
      isCalculationEnabled?: boolean
      timeLimitType?: 'NONE' | 'MIN_TIME' | 'MAX_TIME' | 'RANGE'
      minTimeOffset?: number
      maxTimeOffset?: number
      fixedStartTime?: string
      fixedEndTime?: string
      timeRange?: string
      correctAnswer?: string
      pattern?: string
      errorMessage?: string
    }
    logic?: LogicRule[]
    pipingEnabled?: boolean
    lookupSettings: {
      columnName?: string
      connectionId?: number
      connectionType?: 'SQL' | 'API' | 'ORACLE' | 'GOOGLE_SHEETS'
      hubName?: string
      valueMappings?: { source: string; target: string }[]
      conditionMappings?: { fieldId: string; operator: string; value: any }[]
    }
    aiSettings?: {
      validateTypeKeyword?: string
      formControlValidate?: { masterFormId: number, masterFormColumn: any[], conditionFields?: string[] }
      fileValidation?: {
        enableExtraction?: boolean
        extractionRules?: string
        enableClassification?: boolean
        classificationRules?: string
      }
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

export interface WelcomePageSettings {
  buttonText: string
  description: string
  enabled: boolean
  title: string
}

const initialState = {
  activeQuestionId: null,
  closedMessage: 'This form is currently closed.',
  conversationalMode: false,
  coordinator: '',
  copiedQuestion: null,
  description: '',
  footerText: '',
  formType: 'WORKFLOW' as const,
  headerText: '',
  hubLinkIds: [],
  isBuilderMode: true,
  isPreviewOpen: false,
  isPublishOpen: false,
  isSidebarOpen: false,
  isLeftSidebarCollapsed: false,
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
  showThankYouPage: false,
  showWelcomePage: false,
  welcomePage: {
    buttonText: 'Start',
    description: 'Welcome to our form.',
    enabled: true,
    title: 'Welcome',
  },
  thankYouPage: {
    buttonText: 'Submit',
    description: 'Your submission has been received.',
    enabled: true,
    title: 'Thank you!',
  },
  uid: '',
  sidebarView: 'explorer' as const,
  addFieldPosition: null,
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
          return { panels: newPanels, lastAddedPanelId: newPanel.id }
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
            id: generateId(),
            fields: original.fields.map(f => ({
              ...f,
              id: generateId(),
              label: `${f.label} (Copy)`
            }))
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

      updatePanel: (id, updates) =>
        set((state) => ({
          panels: state.panels.map((p) =>
            p.id === id ? { ...p, settings: { ...p.settings, ...updates } } : p,
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

      // Clipboard Actions
      setCopiedQuestion: (copiedQuestion) => set({ copiedQuestion }),
      pasteQuestion: (panelId, index) =>
        set((state) => {
          if (!state.copiedQuestion) return state

          const newQuestion = {
            ...state.copiedQuestion,
            id: generateId(),
            label: `${state.copiedQuestion.label} (Copy)`,
          }

          const newPanels = state.panels.map((p) => {
            if (p.id !== panelId) return p
            const newFields = [...p.fields]
            newFields.splice(index, 0, newQuestion)
            return { ...p, fields: newFields }
          })

          return { activeQuestionId: newQuestion.id, panels: newPanels }
        }),

      // UI Selection Actions
      setActiveQuestionId: (activeQuestionId) => set({ activeQuestionId }),
      setSelectionType: (selectionType) => set({ selectionType }),
      clearSelection: () =>
        set({ activeQuestionId: null, selectionType: 'general' }),
      clearLastAddedPanelId: () => set({ lastAddedPanelId: null }),

      // Sidebar Actions
      setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
      setLeftSidebarCollapsed: (isLeftSidebarCollapsed) => set({ isLeftSidebarCollapsed }),
      setSidebarView: (sidebarView) => set({ sidebarView }),
      setAddFieldPosition: (addFieldPosition) => set({ addFieldPosition }),

      // Form Metadata Actions
      setName: (name) => set({ name }),
      setDescription: (description) => set({ description }),
      setFormType: (formType) => set({ formType }),
      setLayout: (layout) => set({ layout }),
      setCoordinator: (coordinator) => set({ coordinator }),
      setPublishStatus: (publishStatus) => set({ publishStatus }),
      setPublishOpen: (isPublishOpen) => set({ isPublishOpen }),
      setPreviewMode: (previewMode) => set({ previewMode }),
      setIsPreviewOpen: (isPreviewOpen) => set({ isPreviewOpen }),
      setIsBuilderMode: (isBuilderMode) => set({ isBuilderMode }),
      setPanels: (panels) => set({ panels }),

      // Page Settings Actions
      setWelcomePage: (updates) =>
        set((state) => ({
          welcomePage: { ...state.welcomePage, ...updates },
        })),
      setThankYouPage: (updates) =>
        set((state) => ({
          thankYouPage: { ...state.thankYouPage, ...updates },
        })),
      setShowWelcomePage: (showWelcomePage) => set({ showWelcomePage }),
      setShowThankYouPage: (showThankYouPage) => set({ showThankYouPage }),

      // Management Actions
      setResponseLimit: (responseLimit) => set({ responseLimit }),
      setSchedule: (scheduleStart, scheduleEnd) =>
        set({ scheduleEnd, scheduleStart }),
      setClosedMessage: (closedMessage) => set({ closedMessage }),
      setConversationalMode: (conversationalMode) =>
        set({ conversationalMode }),
      setHeaderFooter: (updates) =>
        set((state) => ({
          footerText: updates.footer ?? state.footerText,
          headerText: updates.header ?? state.headerText,
          showHeaderFooter: updates.show ?? state.showHeaderFooter,
        })),

      // Lifecycle Actions
      loadForm: (data: any) => {
        if (!data || !data.formJson) return
        const json = data.formJson
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
          layout: genSettings.layout || 'typeform',
          name: genSettings.name || 'Untitled Form',
          panels: json.panels || [],
          publishStatus: json.settings?.publish?.publishOption || 'DRAFT',
          secondaryPanels: json.secondaryPanels || [],
          uid: data.uid || generateId(),
        })
      },

      resetForm: () => set({ ...initialState, uid: generateId() }),

      saveForm: async (targetStatus) => {
        const state = get()
        const currentStatus = targetStatus || state.publishStatus

        if (targetStatus) {
          set({ publishStatus: targetStatus })
        }

        const payload = cleanFormPayload({
          ...state,
          publishStatus: currentStatus,
        })

        const hasFields = state.panels.some((p) => p.fields.length > 0)
        if (!hasFields) {
          notifications.show({
            color: 'orange',
            message: 'Please add at least one field to your form before saving.',
            title: 'Empty Form',
          })
          return false
        }

        try {
          let response
          const path = window.location.pathname
          const isCreation = path === '/form-builder' || path === '/form-builder/' || path.endsWith('/form-builder')

          if (!isCreation) {
            const parts = path.split('/')
            const formId = parts[parts.length - 1]
            response = await formApi.updateForm(formId, payload)
          } else {
            response = await formApi.createForm(payload)
          }

          if (response.error) {
            notifications.show({
              color: 'red',
              message: response.error,
              title: 'Error Saving Form',
            })
            return false
          }

          notifications.show({
            color: 'teal',
            message: `Your form has been ${currentStatus === 'PUBLISHED' ? 'published' : 'saved'} successfully.`,
            title: 'Success!',
          })
          return true
        } catch (error) {
          notifications.show({
            color: 'red',
            message: 'An unexpected error occurred while saving.',
            title: 'Unexpected Error',
          })
          return false
        }
      },

      appendAIResponse: (data) =>
        set((state) => {
          if (!data) return state

          const panels = (data.panels || []).map((p: any) => ({
            fields: (p.fields || []).map((f: any) => ({
              ...f,
              id: generateId(),
              label: f.label || f.title || 'Untitled Field',
              type: (f.type || 'SHORT_TEXT').toUpperCase(),
              settings: {
                aiSettings: f.settings?.aiSettings || {},
                general: {
                  hideLabel: f.settings?.general?.hideLabel ?? false,
                  placeholder: f.settings?.general?.placeholder || '',
                  size: f.settings?.general?.size || 'col-12',
                  tooltip: f.settings?.general?.tooltip || '',
                  visibility: f.settings?.general?.visibility || 'NORMAL',
                },
                lookupSettings: f.settings?.lookupSettings || {},
                specific: {
                  ...f.settings?.specific,
                  customOptions: Array.isArray(f.settings?.specific?.options)
                    ? f.settings.specific.options.join('\n')
                    : f.settings?.specific?.customOptions || '',
                  tableColumns: f.settings?.specific?.tableColumns || [],
                },
                validation: {
                  fieldRule: f.settings?.validation?.fieldRule || 'OPTIONAL',
                  ...f.settings?.validation,
                },
              },
            })),
            id: generateId(),
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
            panels: panels.length > 0 ? panels : state.panels,
            selectionType: 'general',
            showThankYouPage:
              data.thankYouPage?.enabled ?? state.showThankYouPage,
            showWelcomePage: data.welcomePage?.enabled ?? state.showWelcomePage,
            thankYouPage: data.thankYouPage
              ? { ...state.thankYouPage, ...data.thankYouPage }
              : state.thankYouPage,
            welcomePage: data.welcomePage
              ? { ...state.welcomePage, ...data.welcomePage }
              : state.welcomePage,
          }
        }),
    }),


    {
      name: 'form-builder-storage-v3',
      version: 3,
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
