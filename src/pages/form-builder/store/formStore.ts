import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import formApi from '@/api/form/form'
import { notifications } from '@mantine/notifications'


export const generateId = () => {
    try {
        return crypto.randomUUID()
    } catch (e) {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
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

export type QuestionWidth = 'col-3' | 'col-4' | 'col-6' | 'col-12'

export interface Question {
  id: string
  label: string
  displayLabel?: string
  type: QuestionType
  settings: {
    general: {
      hideLabel: boolean
      size: QuestionWidth
      visibility: 'NORMAL' | 'READ_ONLY' | 'HIDDEN'
      placeholder?: string
      description?: string
      hidden?: boolean
      readOnly?: boolean
      tooltip?: string
      url?: string
    }
    specific: {
      defaultValue?: string
      customDefaultValue?: any
      optionsType?: string
      optionsSource?: string
      dividerStyle?: 'SOLID' | 'DASHED' | 'DOTTED'
      customOptions?: string
      separateOptionsUsing?: string
      allowToAddNewOptions?: boolean
      optionsPerLine?: number
      tableColumns?: any[]
      columns?: any[]
      tableRowsType?: string
      numRows?: number
      matrixColumns?: any[]
      matrixRows?: any[]
      matrixRowLabels?: string[]
      matrixColumnLabels?: string[]
      fibFields?: any[]
      autoGenerateValue?: { enabled: boolean, prefix: string, suffix: string }
      iconType?: 'STAR' | 'HEART'
      iconCount?: number
      allowHalfRating?: boolean
      allowMultipleFiles?: boolean
      allowMultipleSignatures?: boolean
      maxLevel?: number
      childFieldType?: string
    }
    validation: {
      fieldRule: 'OPTIONAL' | 'REQUIRED'
      contentRule?: string
      minimum?: string | number
      maximum?: string | number
      allowedFileTypes?: string[]
      maxFileSize?: number
      dateRange?: 'PAST' | 'FUTURE' | 'CUSTOM'
      timeRange?: string
      correctAnswer?: string
    }
    aiSettings: {
      validateTypeKeyword?: string
      formControlValidate?: { masterFormId: number, masterFormColumn: any[], conditionFields?: string[] }
      fileValidation?: {
        enableExtraction?: boolean
        extractionRules?: string
        enableClassification?: boolean
        classificationRules?: string
      }
    }
    lookupSettings: {
      columnName?: string
      connectionId?: number
    }
  }
}


export interface Panel {
  id: string
  settings: {
    title: string
    description: string
  }
  fields: Question[]
}

export type FormLayout = 'typeform' | 'grid' | 'full'
export type FormType = 'WORKFLOW' | 'FEEDBACK'
export type PublishStatus = 'DRAFT' | 'PUBLISHED'

interface WelcomePage {
  enabled: boolean;
  title: string;
  description: string;
  buttonText: string;
}

interface FormStore {
  uid: string
  name: string
  description: string
  panels: Panel[]
  secondaryPanels: Panel[]
  activeQuestionId: string | null
  isBuilderMode: boolean
  
  // UI State
  isSidebarOpen: boolean
  isPublishOpen: boolean
  isPreviewOpen: boolean
  selectionType: 'general' | 'question' | 'welcome' | 'thank_you'
  
  // Settings
  layout: FormLayout
  formType: FormType
  publishStatus: PublishStatus
  hubLinkIds: any[]
  coordinator: string
  previewMode: 'typeform' | 'grid' | 'full'
  
  // Special Pages
  welcomePage: WelcomePage
  thankYouPage: WelcomePage
  showWelcomePage: boolean
  showThankYouPage: boolean

  copiedQuestion: Question | null
  setCopiedQuestion: (question: Question | null) => void
  pasteQuestion: (panelId: string, index: number) => void

  setName: (name: string) => void
  setDescription: (description: string) => void
  setPanels: (panels: Panel[]) => void
  setActiveQuestionId: (id: string | null) => void
  setIsBuilderMode: (isBuilder: boolean) => void
  
  setFormType: (type: FormType) => void
  setLayout: (layout: FormLayout) => void
  setCoordinator: (coordinator: string) => void
  setPublishStatus: (status: PublishStatus) => void

  // UI Actions
  setSidebarOpen: (open: boolean) => void
  setPublishOpen: (open: boolean) => void
  setPreviewMode: (mode: 'typeform' | 'grid' | 'full') => void
  setIsPreviewOpen: (open: boolean) => void
  setSelectionType: (type: 'general' | 'question' | 'welcome' | 'thank_you') => void
  
  // Special Page Actions
  setWelcomePage: (updates: Partial<WelcomePage>) => void
  setThankYouPage: (updates: Partial<WelcomePage>) => void
  setShowWelcomePage: (show: boolean) => void
  setShowThankYouPage: (show: boolean) => void

  clearSelection: () => void

  // Panel Actions (formerly Page)
  addPanel: (index?: number) => void
  deletePanel: (id: string) => void
  updatePanel: (id: string, updates: Partial<Panel['settings']>) => void
  movePanel: (id: string, direction: 'up' | 'down') => void

  // Question Actions (formerly Question)
  addQuestion: (panelId: string, question: Question, index?: number) => void
  updateQuestion: (id: string, updates: any) => void
  deleteQuestion: (id: string) => void
  duplicateQuestion: (id: string) => void
  moveQuestion: (id: string, toPanelId: string, index: number) => void

  // AI Actions
  appendAIResponse: (data: any) => void
  lastAddedPanelId: string | null
  clearLastAddedPanelId: () => void

  loadForm: (data: any) => void
  resetForm: () => void
  saveForm: (targetStatus?: PublishStatus) => Promise<boolean>
}




const initialState = {
  uid: '',
  name: 'Untitled Form',
  description: '',
  panels: [
    {
      id: 'panel-1',
      settings: { title: 'Section 1', description: '' },
      fields: []
    }
  ],
  secondaryPanels: [],
  activeQuestionId: null,
  isBuilderMode: true,
  
  isSidebarOpen: true,
  isPublishOpen: false,
  isPreviewOpen: false,
  selectionType: 'general' as const,
  
  layout: 'typeform' as const,
  formType: 'WORKFLOW' as const,
  publishStatus: 'DRAFT' as const,
  hubLinkIds: [],
  coordinator: '',
  previewMode: 'typeform' as const,
  
  welcomePage: {
    enabled: false,
    title: 'Welcome to our form',
    description: 'Please take a moment to fill out this information.',
    buttonText: 'Start'
  },
  thankYouPage: {
    enabled: false,
    title: 'Thank you!',
    description: 'Your submission has been received.',
    buttonText: 'Submit'
  },
  showWelcomePage: false,
  showThankYouPage: false,

  lastAddedPanelId: null,
  copiedQuestion: null
}



export const useFormStore = create<FormStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      uid: generateId(),
      
      setName: (name) => set({ name }),
      setCopiedQuestion: (copiedQuestion) => set({ copiedQuestion }),

      pasteQuestion: (panelId, index) => set((state) => {
        if (!state.copiedQuestion) return state

        const newQuestion = { 
          ...state.copiedQuestion, 
          id: generateId(),
          label: `${state.copiedQuestion.label} (Copy)`
        }

        const newPanels = state.panels.map(p => {
          if (p.id !== panelId) return p
          const newFields = [...p.fields]
          newFields.splice(index, 0, newQuestion)
          return { ...p, fields: newFields }
        })

        return { panels: newPanels, activeQuestionId: newQuestion.id }
      }),

      setDescription: (description) => set({ description }),
      setPanels: (panels) => set({ panels }),
      setActiveQuestionId: (activeQuestionId) => set({ activeQuestionId }),
      setIsBuilderMode: (isBuilderMode) => set({ isBuilderMode }),
      
      setFormType: (formType) => set({ formType }),
      setLayout: (layout) => set({ layout }),
      setCoordinator: (coordinator) => set({ coordinator }),
      setPublishStatus: (publishStatus) => set({ publishStatus }),

      setSidebarOpen: (open) => set({ isSidebarOpen: open }),
      setPublishOpen: (open) => set({ isPublishOpen: open }),
      setPreviewMode: (mode) => set({ previewMode: mode }),
      setIsPreviewOpen: (open) => set({ isPreviewOpen: open }),
      setSelectionType: (selectionType) => set({ selectionType }),

      setWelcomePage: (updates) => set((state) => ({
        welcomePage: { ...state.welcomePage, ...updates }
      })),
      setThankYouPage: (updates) => set((state) => ({
        thankYouPage: { ...state.thankYouPage, ...updates }
      })),
      setShowWelcomePage: (showWelcomePage) => set({ showWelcomePage }),
      setShowThankYouPage: (showThankYouPage) => set({ showThankYouPage }),

      clearSelection: () => set({ activeQuestionId: null, selectionType: 'general' }),

      addPanel: (index) => set((state) => {
        const newPanel: Panel = {
          id: generateId(),
          settings: { title: `Section ${state.panels.length + 1}`, description: '' },
          fields: []
        }
        const newPanels = [...state.panels]
        if (typeof index === 'number') {
          newPanels.splice(index, 0, newPanel)
        } else {
          newPanels.push(newPanel)
        }
        return { panels: newPanels }
      }),

      deletePanel: (id) => set((state) => ({
        panels: state.panels.filter(p => p.id !== id)
      })),

      updatePanel: (id, updates) => set((state) => ({
        panels: state.panels.map(p => p.id === id ? { ...p, settings: { ...p.settings, ...updates } } : p)
      })),

      movePanel: (id, direction) => set((state) => {
        const index = state.panels.findIndex(p => p.id === id)
        if (index === -1) return state
        const newPanels = [...state.panels]
        const newIndex = direction === 'up' ? index - 1 : index + 1
        if (newIndex < 0 || newIndex >= newPanels.length) return state
        const [moved] = newPanels.splice(index, 1)
        newPanels.splice(newIndex, 0, moved)
        return { panels: newPanels }
      }),

      addQuestion: (panelId, question, index) => set((state) => ({
        panels: state.panels.map(p => {
          if (p.id !== panelId) return p
          const newFields = [...p.fields]
          if (typeof index === 'number') {
            newFields.splice(index, 0, question)
          } else {
            newFields.push(question)
          }
          return { ...p, fields: newFields }
        }),
        activeQuestionId: question.id
      })),

      updateQuestion: (id, updates) => set((state) => ({
        panels: state.panels.map(p => ({
          ...p,
          fields: p.fields.map(f => {
              if (f.id !== id) return f
              if (typeof updates === 'function') return updates(f)
              return { ...f, ...updates }
          })
        }))
      })),

      deleteQuestion: (id) => set((state) => ({
        panels: state.panels.map(p => ({
          ...p,
          fields: p.fields.filter(f => f.id !== id)
        })),
        activeQuestionId: state.activeQuestionId === id ? null : state.activeQuestionId
      })),

      duplicateQuestion: (id) => set((state) => {
        const newPanels = state.panels.map(p => {
          const index = p.fields.findIndex(f => f.id === id)
          if (index === -1) return p
          const clone = { ...p.fields[index], id: generateId(), label: `${p.fields[index].label} (Copy)` }
          const newFields = [...p.fields]
          newFields.splice(index + 1, 0, clone)
          return { ...p, fields: newFields }
        })
        return { panels: newPanels }
      }),

      moveQuestion: (id, toPanelId, index) => set((state) => {
        let questionToMove: Question | undefined
        const panelsWithout = state.panels.map(p => {
          const q = p.fields.find(f => f.id === id)
          if (q) {
            questionToMove = q
            return { ...p, fields: p.fields.filter(f => f.id !== id) }
          }
          return p
        })
        if (!questionToMove) return state
        return {
          panels: panelsWithout.map(p => {
            if (p.id !== toPanelId) return p
            const newFields = [...p.fields]
            newFields.splice(index, 0, questionToMove!)
            return { ...p, fields: newFields }
          })
        }
      }),

      appendAIResponse: (data) => set((state) => {
        if (!data) return state
        
        const panels = (data.panels || []).map((p: any) => ({
          id: generateId(),
          settings: {
            title: p.settings?.title || p.title || 'Untitled Section',
            description: p.settings?.description || p.description || ''
          },
          fields: (p.fields || []).map((f: any) => ({
            ...f,
            id: generateId(),
            label: f.label || f.title || 'Untitled Field',
            type: (f.type || 'SHORT_TEXT').toUpperCase(),
            settings: {
              general: {
                hideLabel: f.settings?.general?.hideLabel ?? false,
                size: f.settings?.general?.size || 'col-12',
                visibility: f.settings?.general?.visibility || 'NORMAL',
                placeholder: f.settings?.general?.placeholder || '',
                tooltip: f.settings?.general?.tooltip || ''
              },
              specific: {
                ...f.settings?.specific,
                customOptions: Array.isArray(f.settings?.specific?.options) 
                  ? f.settings.specific.options.join('\n') 
                  : f.settings?.specific?.customOptions || '',
                tableColumns: f.settings?.specific?.tableColumns || []
              },
              validation: {
                fieldRule: f.settings?.validation?.fieldRule || 'OPTIONAL',
                ...f.settings?.validation
              },
              aiSettings: f.settings?.aiSettings || {},
              lookupSettings: f.settings?.lookupSettings || {}
            }
          }))
        }))

        return {
          ...state,
          name: data.name || state.name,
          description: data.description || state.description,
          panels: panels.length > 0 ? panels : state.panels,
          layout: data.layout || state.layout,
          formType: data.formType || state.formType,
          welcomePage: data.welcomePage ? { ...state.welcomePage, ...data.welcomePage } : state.welcomePage,
          thankYouPage: data.thankYouPage ? { ...state.thankYouPage, ...data.thankYouPage } : state.thankYouPage,
          showWelcomePage: data.welcomePage?.enabled ?? state.showWelcomePage,
          showThankYouPage: data.thankYouPage?.enabled ?? state.showThankYouPage,
          activeQuestionId: null,
          selectionType: 'general'
        }
      }),


      clearLastAddedPanelId: () => set({ lastAddedPanelId: null }),

      loadForm: (data: any) => {
        if (!data || !data.formJson) return
        const json = data.formJson
        const genSettings = json.settings?.general || {}
        
        set({
          uid: data.uid || generateId(),
          name: genSettings.name || 'Untitled Form',
          description: genSettings.description || '',
          panels: json.panels || [],
          secondaryPanels: json.secondaryPanels || [],
          activeQuestionId: null,
          layout: genSettings.layout || 'typeform',
          formType: ['WORKFLOW', 'FEEDBACK'].includes(genSettings.type) 
            ? genSettings.type 
            : 'WORKFLOW',
          coordinator: genSettings.coordinator || '',
          publishStatus: json.settings?.publish?.publishOption || 'DRAFT',
          hubLinkIds: json.settings?.hubLinkIds || [],
        })
      },


      resetForm: () => set({ ...initialState, uid: generateId() }),

      saveForm: async (targetStatus) => {
        const state = get()
        const currentStatus = targetStatus || state.publishStatus
        
        // Update status in state if targetStatus provided
        if (targetStatus) {
           set({ publishStatus: targetStatus })
        }

        const payload = cleanFormPayload({ ...state, publishStatus: currentStatus })
        
        // Mandatory check: at least one field
        const hasFields = state.panels.some(p => p.fields.length > 0)
        if (!hasFields) {
           notifications.show({
             title: 'Empty Form',
             message: 'Please add at least one field to your form before saving.',
             color: 'orange'
           })
           return false
        }

        try {
           console.log('[FormStore] Attempting to save form...', { uid: state.uid, name: state.name, status: currentStatus })
           let response;
           
           const path = window.location.pathname
           const isCreation = path === '/form-builder' || path === '/form-builder/' || path.endsWith('/form-builder')
           
           console.log('[FormStore] Mode:', isCreation ? 'CREATE' : 'UPDATE', 'Path:', path)

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
               title: 'Error Saving Form',
               message: response.error,
               color: 'red'
             })
             return false
           }

           notifications.show({
             title: 'Success!',
             message: `Your form has been ${currentStatus === 'PUBLISHED' ? 'published' : 'saved'} successfully.`,
             color: 'teal'
           })
           return true
        } catch (error) {
          console.error('Save failed:', error)
          notifications.show({
            title: 'Unexpected Error',
            message: 'An unexpected error occurred while saving.',
            color: 'red'
          })
          return false
        }
      }
    }),



    {
      name: 'form-builder-storage-v3',
      version: 3,
    }
  )
)

export const cleanField = (field: Question) => {
    const cleaned = JSON.parse(JSON.stringify(field))
    const keysToRemove = ['filterBy', 'filter', 'filters', 'isManualChange', 'lookupFilterBy', 'lookupFilter']
    keysToRemove.forEach(key => delete (cleaned as any)[key])
    return cleaned
}

export const cleanFormPayload = (state: any) => {
    return {
        uid: state.uid,
        panels: state.panels.map((p: any) => ({
            ...p,
            fields: p.fields.map((f: any) => cleanField(f))
        })),
        secondaryPanels: state.secondaryPanels.map((p: any) => ({
            ...p,
            fields: p.fields.map((f: any) => cleanField(f))
        })),
        settings: {
            general: {
                name: state.name,
                description: state.description,
                layout: state.layout,
                type: state.formType,
                coordinator: state.coordinator
            },

            rules: [],
            publish: {
                publishOption: state.publishStatus,
                publishSchedule: "",
                unpublishSchedule: ""
            },
            hubLinkIds: state.hubLinkIds
        },
        isDeleted: false
    }
}
