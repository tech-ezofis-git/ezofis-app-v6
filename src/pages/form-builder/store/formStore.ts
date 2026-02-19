import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const generateId = () => {
    try {
        return crypto.randomUUID()
    } catch (e) {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    }
}

export type QuestionType =
  | 'short_text'
  | 'label'
  | 'long_text'
  | 'number'
  | 'date'
  | 'time'
  | 'date_time'
  | 'choices'
  | 'dropdown'
  | 'checkbox'
  | 'rating'
  | 'counter'
  | 'calculated'
  | 'country_code'
  | 'password'
  | 'text_builder' // Rich Text
  | 'table'
  | 'currency'
  | 'address'
  | 'full_name'
  | 'email'
  | 'phone'
  | 'divider'
  | 'file_upload'

export type QuestionWidth = 'full' | '1/2' | '1/3'

export interface TableColumn {
  id: string
  name: string
  type: QuestionType
  size: 'sm' | 'md' | 'lg'
}

export interface Question {
  id: string
  title: string
  description: string
  type: QuestionType
  placeholder?: string
  options?: string[]
  required?: boolean
  hidden?: boolean
  readOnly?: boolean
  aiRiskScore?: number
  width?: QuestionWidth
  columns?: TableColumn[]
}

export interface Page {
  id: string
  title: string
  description: string
  questions: Question[]
}

export type FormLayout = 'typeform' | 'grid' | 'full'
export type FormType = 'workflow' | 'master' | 'task' | 'sla' | 'feedback'
export type PreviewMode = 'typeform' | 'grid' | 'heatmap'

interface FormStore {
  name: string
  description: string
  pages: Page[]
  activeQuestionId: string | null
  previewMode: PreviewMode
  hidePreview: boolean
  isBuilderMode: boolean
  
  // New Metadata
  formType: FormType
  coordinator: string
  layout: FormLayout
  
  showWelcomePage: boolean
  welcomePage: {
    title: string
    description: string
    buttonText: string
    enabled: boolean
  }
  
  showThankYouPage: boolean
  thankYouPage: {
    title: string
    description: string
    enabled: boolean
  }
  
  showHeaderFooter: boolean
  headerText: string
  footerText: string

  setName: (name: string) => void
  setDescription: (description: string) => void
  setPages: (pages: Page[]) => void
  setActiveQuestionId: (id: string | null) => void
  setPreviewMode: (mode: PreviewMode) => void
  setHidePreview: (hide: boolean) => void
  setIsBuilderMode: (isBuilder: boolean) => void
  
  // Metadata Setters
  setFormType: (type: FormType) => void
  setCoordinator: (coordinator: string) => void
  setLayout: (layout: FormLayout) => void
  setWelcomePage: (updates: Partial<FormStore['welcomePage']>) => void
  setThankYouPage: (updates: Partial<FormStore['thankYouPage']>) => void
  setHeaderFooter: (updates: { show?: boolean, header?: string, footer?: string }) => void

  // Page Actions
  addPage: (index?: number) => void
  deletePage: (id: string) => void
  updatePage: (id: string, updates: Partial<Page>) => void
  duplicatePage: (id: string) => void

  // Question Actions
  addQuestion: (pageId: string, question: Question, index?: number) => void
  addTemplateGroup: (pageId: string, templateType: 'address_info' | 'contact_info', index?: number) => void
  updateQuestion: (id: string, updates: Partial<Question>) => void
  deleteQuestion: (id: string) => void
  duplicateQuestion: (id: string) => void
  moveQuestion: (id: string, toPageId: string, index: number) => void

  // UI State
  isPreviewOpen: boolean
  setIsPreviewOpen: (open: boolean) => void

  // AI Actions
  appendAIResponse: (data: { name: string, description: string, pages: any[] }) => void
}

export const useFormStore = create<FormStore>()(
  persist(
    (set) => ({
      name: 'Untitled Form',
      description: '',
      pages: [
        {
          id: 'page-1',
          title: 'Page 1',
          description: '',
          questions: [
            { id: '1', title: "Can you tell me what you're wondering about?", description: "", type: 'short_text', width: 'full' },
            { id: '2', title: "Full Name", description: "", type: 'full_name', placeholder: "Enter your full name", width: '1/2' },
            { id: '3', title: "Preferred Appointment Date", description: "", type: 'date', width: '1/2' },
            { id: '4', title: "Rate Our Service", description: "", type: 'rating', width: 'full' },
          ]
        }
      ],
      activeQuestionId: '1',
      previewMode: 'typeform',
      hidePreview: false,
      isPreviewOpen: false,
      isBuilderMode: true,
      
      formType: 'workflow',
      coordinator: '',
      layout: 'typeform',
      
      showWelcomePage: false,
      welcomePage: {
        title: 'Welcome to our form',
        description: 'Please take a moment to fill out this information.',
        buttonText: 'Start',
        enabled: false
      },
      
      showThankYouPage: false,
      thankYouPage: {
        title: 'Thank you!',
        description: 'Your response has been recorded.',
        enabled: false
      },
      
      showHeaderFooter: false,
      headerText: '',
      footerText: '',

      setName: (name) => set({ name }),
      setDescription: (description) => set({ description }),
      setPages: (pages) => set({ pages }),
      setActiveQuestionId: (activeQuestionId) => set({ activeQuestionId }),
      setPreviewMode: (previewMode) => set({ previewMode }),
      setHidePreview: (hidePreview) => set({ hidePreview }),
      setIsPreviewOpen: (isPreviewOpen) => set({ isPreviewOpen }),
      setIsBuilderMode: (isBuilderMode) => set({ isBuilderMode }),
      
      setFormType: (formType) => set({ formType }),
      setCoordinator: (coordinator) => set({ coordinator }),
      setLayout: (layout) => set({ layout }),
      setWelcomePage: (updates) => set((state) => ({ 
        welcomePage: { ...state.welcomePage, ...updates },
        showWelcomePage: updates.enabled ?? state.showWelcomePage
      })),
      setThankYouPage: (updates) => set((state) => ({ 
        thankYouPage: { ...state.thankYouPage, ...updates },
        showThankYouPage: updates.enabled ?? state.showThankYouPage
      })),
      setHeaderFooter: (updates) => set((state) => ({
        showHeaderFooter: updates.show ?? state.showHeaderFooter,
        headerText: updates.header ?? state.headerText,
        footerText: updates.footer ?? state.footerText
      })),

      addPage: (index) => set((state) => {
        const newPage: Page = {
          id: generateId(),
          title: `Page ${state.pages.length + 1}`,
          description: '',
          questions: []
        }
        const newPages = [...state.pages]
        if (typeof index === 'number') {
          newPages.splice(index, 0, newPage)
        } else {
          newPages.push(newPage)
        }
        return { pages: newPages }
      }),

      deletePage: (id) => set((state) => {
        return { pages: state.pages.filter(p => p.id !== id) }
      }),

      updatePage: (id, updates) => set((state) => ({
        pages: state.pages.map(p => p.id === id ? { ...p, ...updates } : p)
      })),

      duplicatePage: (id) => set((state) => {
        const pageIndex = state.pages.findIndex(p => p.id === id)
        if (pageIndex === -1) return state
        
        const pageToClone = state.pages[pageIndex]
        const newPage: Page = {
          ...pageToClone,
          id: generateId(),
          title: `${pageToClone.title} (Copy)`,
          questions: pageToClone.questions.map(q => ({ ...q, id: generateId() }))
        }
        
        const newPages = [...state.pages]
        newPages.splice(pageIndex + 1, 0, newPage)
        return { pages: newPages }
      }),

      addQuestion: (pageId, question, index) => set((state) => ({
        pages: state.pages.map(p => {
          if (p.id !== pageId) return p
          const newQuestions = [...p.questions]
          if (typeof index === 'number') {
            newQuestions.splice(index, 0, { ...question, width: question.width || 'full' })
          } else {
            newQuestions.push({ ...question, width: question.width || 'full' })
          }
          return { ...p, questions: newQuestions }
        }),
        activeQuestionId: question.id
      })),

      addTemplateGroup: (pageId, templateType, index) => set((state) => {
        let templateQuestions: Question[] = []
        if (templateType === 'address_info') {
          templateQuestions = [
            { id: generateId(), title: 'Street Address', description: '', type: 'short_text', width: 'full' },
            { id: generateId(), title: 'City', description: '', type: 'short_text', width: '1/2' },
            { id: generateId(), title: 'State / Province', description: '', type: 'short_text', width: '1/2' },
            { id: generateId(), title: 'ZIP / Postal Code', description: '', type: 'short_text', width: '1/2' },
            { id: generateId(), title: 'Country', description: '', type: 'country_code', width: '1/2' },
          ]
        } else if (templateType === 'contact_info') {
          templateQuestions = [
            { id: generateId(), title: 'Full Name', description: '', type: 'full_name', width: '1/2' },
            { id: generateId(), title: 'Email Address', description: '', type: 'email', width: '1/2' },
            { id: generateId(), title: 'Phone Number', description: '', type: 'phone', width: '1/2' },
            { id: generateId(), title: 'Company / Organization', description: '', type: 'short_text', width: '1/2' },
          ]
        }

        const newPages = state.pages.map(p => {
          if (p.id !== pageId) return p
          const newQuestions = [...p.questions]
          const insertIndex = typeof index === 'number' ? index : newQuestions.length
          newQuestions.splice(insertIndex, 0, ...templateQuestions)
          return { ...p, questions: newQuestions }
        })

        return {
          pages: newPages,
          activeQuestionId: templateQuestions[0]?.id || state.activeQuestionId
        }
      }),

      updateQuestion: (id, updates) => set((state) => ({
        pages: state.pages.map(p => ({
          ...p,
          questions: p.questions.map(q => q.id === id ? { ...q, ...updates } : q)
        }))
      })),

      deleteQuestion: (id) => set((state) => {
        let nextActiveId = state.activeQuestionId
        
        const newPages = state.pages.map(p => {
          const qIndex = p.questions.findIndex(q => q.id === id)
          if (qIndex === -1) return p

          // If deleting active question, try to set active to next, prev, or parent page
          if (state.activeQuestionId === id) {
            if (p.questions.length > 1) {
              nextActiveId = p.questions[qIndex + 1]?.id || p.questions[qIndex - 1]?.id || null
            } else {
              nextActiveId = null
            }
          }
          
          const newQuestions = p.questions.filter(q => q.id !== id)
          return {
            ...p,
            questions: newQuestions
          }
        })

        return { pages: newPages, activeQuestionId: nextActiveId }
      }),

      duplicateQuestion: (id) => set((state) => {
        const newPages = state.pages.map(p => {
          const qIndex = p.questions.findIndex(q => q.id === id)
          if (qIndex === -1) return p
          
          const qToClone = p.questions[qIndex]
          const newQuestion = { ...qToClone, id: generateId(), title: `${qToClone.title} (Copy)` }
          const newQuestions = [...p.questions]
          newQuestions.splice(qIndex + 1, 0, newQuestion)
          
          return { ...p, questions: newQuestions }
        })
        return { pages: newPages }
      }),

      moveQuestion: (id, toPageId, index) => set((state) => {
        // Find and remove question
        let questionToMove: Question | undefined
        const pagesWithoutQuestion = state.pages.map(p => {
          const q = p.questions.find(q => q.id === id)
          if (q) {
            questionToMove = q
            return { ...p, questions: p.questions.filter(q => q.id !== id) }
          }
          return p
        })

        if (!questionToMove) return state

        // Add to new location
        return {
          pages: pagesWithoutQuestion.map(p => {
            if (p.id !== toPageId) return p
            const newQuestions = [...p.questions]
            newQuestions.splice(index, 0, questionToMove!)
            return { ...p, questions: newQuestions }
          })
        }
      }),

      appendAIResponse: (data) => set((state) => {
        // Update name/description if they are default
        const updates: Partial<FormStore> = {}
        if (state.name === 'Untitled Form') updates.name = data.name
        if (!state.description) updates.description = data.description

        const mappedPages: Page[] = data.pages.map(p => ({
          id: generateId(),
          title: p.title || 'Untitled Page',
          description: p.description || '',
          questions: (p.questions || []).map((q: any) => ({
            ...q,
            id: generateId(),
            width: q.width || 'full',
            columns: q.columns?.map((c: any) => ({
              ...c,
              id: generateId(),
              size: c.size === '1/2' ? 'md' : c.size === '1/3' ? 'sm' : 'lg'
            }))
          }))
        }))

        return {
          ...updates,
          pages: [...state.pages, ...mappedPages],
          activeQuestionId: mappedPages[0]?.questions[0]?.id || state.activeQuestionId
        }
      })
    }),
    {
      name: 'form-builder-storage-v2', // Change storage key to avoid conflicts
      version: 2,
    }
  )
)
