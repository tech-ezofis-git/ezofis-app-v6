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

export type FormType = 'WORKFLOW' | 'FEEDBACK' | 'MASTER'

export interface Panel {
  fields: Question[]
  id: string
  settings: {
    description: string
    title: string
  }
}

export type PublishStatus = 'DRAFT' | 'PUBLISHED'

export interface Question {
  id: string
  label: string
  type: QuestionType
  displayLabel?: string
  settings: {
    aiSettings: {
      formControlValidate?: { masterFormColumn: any[]; masterFormId: number }
      validateTypeKeyword?: string
    }
    general: {
      description?: string
      dividerType?: string
      hidden?: boolean
      hideLabel: boolean
      placeholder?: string
      readOnly?: boolean
      size: QuestionWidth
      tooltip?: string
      url?: string
      visibility: 'NORMAL' | 'READ_ONLY' | 'HIDDEN'
    }
    lookupSettings: {
      columnName?: string
      connectionId?: number
    }
    specific: {
      allowToAddNewOptions?: boolean
      autoGenerateValue?: { prefix: string; suffix: string }
      columns?: any[]
      customDefaultValue?: any
      customOptions?: string
      defaultValue?: string
      fibFields?: any[]
      matrixColumns?: any[]
      matrixRows?: any[]
      optionsPerLine?: number
      optionsType?: string
      separateOptionsUsing?: string
      tableColumns?: any[]
      tableRowsType?: string
    }
    validation: {
      allowedFileTypes?: string[]
      contentRule?: string
      fieldRule: 'OPTIONAL' | 'REQUIRED'
      maxFileSize?: number
      maximum?: string | number
      minimum?: string | number
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
  | 'COUNTER'
  | 'CALCULATED'
  | 'COUNTRY_CODE'
  | 'ADDRESS'
  | 'FULL_NAME'
  | 'EMAIL'
  | 'PASSWORD'
  | 'TEXT_BUILDER'
export type QuestionWidth = 'col-3' | 'col-4' | 'col-6' | 'col-12'

export interface WelcomePage {
  buttonText: string
  description: string
  enabled: boolean
  title: string
}

interface FormStore {
  activeQuestionId: string | null
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

  // UI State
  isSidebarOpen: boolean
  lastAddedPanelId: string | null
  // Settings
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
  thankYouPage: WelcomePage

  uid: string
  // Special Pages
  welcomePage: WelcomePage
  // Panel Actions (formerly Page)
  addPanel: (index?: number) => void

  // Question Actions (formerly Question)
  addQuestion: (panelId: string, question: Question, index?: number) => void
  // AI Actions
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
  setCoordinator: (coordinator: string) => void
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

  setSelectionType: (
    type: 'general' | 'question' | 'welcome' | 'thank_you',
  ) => void
  setShowThankYouPage: (show: boolean) => void
  setShowWelcomePage: (show: boolean) => void

  // UI Actions
  setSidebarOpen: (open: boolean) => void
  setThankYouPage: (updates: Partial<WelcomePage>) => void
  // Special Page Actions
  setWelcomePage: (updates: Partial<WelcomePage>) => void
}

const initialState = {
  activeQuestionId: null,
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

  isSidebarOpen: true,
  lastAddedPanelId: null,
  layout: 'typeform' as const,
  name: 'Untitled Form',
  panels: [
    {
      fields: [],
      id: 'panel-1',
      settings: { description: '', title: 'Section 1' },
    },
  ],
  previewMode: 'typeform' as const,

  publishStatus: 'DRAFT' as const,
  secondaryPanels: [],
  selectionType: 'general' as const,
  showHeaderFooter: false,

  showThankYouPage: false,
  showWelcomePage: false,
  thankYouPage: {
    buttonText: 'Submit',
    description: 'Your submission has been received.',
    enabled: false,
    title: 'Thank you!',
  },

  uid: '',
  welcomePage: {
    buttonText: 'Start',
    description: 'Please take a moment to fill out this information.',
    enabled: false,
    title: 'Welcome to our form',
  },
}

export const useFormStore = create<FormStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      uid: generateId(),

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
          return { panels: newPanels }
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
      resetForm: () => set({ ...initialState, uid: generateId() }),
      saveForm: async (targetStatus) => {
        const state = get()
        const currentStatus = targetStatus || state.publishStatus

        // Update status in state if targetStatus provided
        if (targetStatus) {
          set({ publishStatus: targetStatus })
        }

        const payload = cleanFormPayload({
          ...state,
          publishStatus: currentStatus,
        })

        // Mandatory check: at least one field
        const hasFields = state.panels.some((p) => p.fields.length > 0)
        if (!hasFields) {
          notifications.show({
            color: 'orange',
            message:
              'Please add at least one field to your form before saving.',
            title: 'Empty Form',
          })
          return false
        }

        try {
          console.log('[FormStore] Attempting to save form...', {
            name: state.name,
            status: currentStatus,
            uid: state.uid,
          })
          let response

          const path = window.location.pathname
          const isCreation =
            path === '/form-builder' ||
            path === '/form-builder/' ||
            path.endsWith('/form-builder')

          console.log(
            '[FormStore] Mode:',
            isCreation ? 'CREATE' : 'UPDATE',
            'Path:',
            path,
          )

          if (!isCreation) {
            const parts = path.split('/')
            const formId = parts[parts.length - 1]
            console.log('[FormStore] Calling updateForm:', formId)
            response = await formApi.updateForm(formId, payload)
          } else {
            console.log('[FormStore] Calling createForm...')
            response = await formApi.createForm(payload)
          }

          console.log('[FormStore] API Response:', response)

          if (response.error) {
            console.error('[FormStore] Save failed with error:', response.error)

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
          console.error('Save failed:', error)
          notifications.show({
            color: 'red',
            message: 'An unexpected error occurred while saving.',
            title: 'Unexpected Error',
          })
          return false
        }
      },
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

      setActiveQuestionId: (activeQuestionId) => set({ activeQuestionId }),
      setCoordinator: (coordinator) => set({ coordinator }),
      setCopiedQuestion: (copiedQuestion) => set({ copiedQuestion }),
      setDescription: (description) => set({ description }),

      setFormType: (formType) => set({ formType }),

      setHeaderFooter: (updates) =>
        set((state) => ({
          footerText: updates.footer ?? state.footerText,
          headerText: updates.header ?? state.headerText,
          showHeaderFooter: updates.show ?? state.showHeaderFooter,
        })),

      setIsBuilderMode: (isBuilderMode) => set({ isBuilderMode }),

      setIsPreviewOpen: (open) => set({ isPreviewOpen: open }),

      setLayout: (layout) => set({ layout }),

      setName: (name) => set({ name }),

      setPanels: (panels) => set({ panels }),

      setPreviewMode: (mode) => set({ previewMode: mode }),

      setPublishOpen: (open) => set({ isPublishOpen: open }),

      setPublishStatus: (publishStatus) => set({ publishStatus }),

      setSelectionType: (selectionType) => set({ selectionType }),

      setShowThankYouPage: (showThankYouPage) => set({ showThankYouPage }),

      setShowWelcomePage: (showWelcomePage) => set({ showWelcomePage }),

      setSidebarOpen: (open) => set({ isSidebarOpen: open }),

      setThankYouPage: (updates) =>
        set((state) => ({
          thankYouPage: { ...state.thankYouPage, ...updates },
        })),

      setWelcomePage: (updates) =>
        set((state) => ({
          welcomePage: { ...state.welcomePage, ...updates },
        })),
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
