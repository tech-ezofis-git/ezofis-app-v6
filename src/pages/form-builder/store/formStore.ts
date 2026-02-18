import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type QuestionType = 'short_text' | 'email' | 'phone' | 'choices' | 'dropdown' | 'checkbox' | 'date' | 'rating' | 'long_text' | 'number'

export interface Question {
  id: string
  title: string
  description: string
  type: QuestionType
  placeholder?: string
  options?: string[]
  required?: boolean
  aiRiskScore?: number
}

export type PreviewMode = 'typeform' | 'grid' | 'heatmap'

interface FormStore {
  name: string
  description: string
  questions: Question[]
  activeQuestionId: string | null
  previewMode: PreviewMode
  hidePreview: boolean
  
  setName: (name: string) => void
  setDescription: (description: string) => void
  setQuestions: (questions: Question[]) => void
  setActiveQuestionId: (id: string | null) => void
  setPreviewMode: (mode: PreviewMode) => void
  setHidePreview: (hide: boolean) => void
  
  updateQuestion: (id: string, updates: Partial<Question>) => void
  addQuestion: (question: Question, index: number) => void
  deleteQuestion: (id: string) => void
}

export const useFormStore = create<FormStore>()(
  persist(
    (set) => ({
      name: 'Untitled Form',
      description: '',
      questions: [
        { id: '1', title: "Can you tell me what you're wondering about?", description: "", type: 'short_text' },
        { id: '2', title: "Full Name", description: "", type: 'short_text', placeholder: "Enter your full name" },
        { id: '3', title: "Preferred Appointment Date", description: "", type: 'date' },
        { id: '4', title: "Rate Our Service", description: "", type: 'rating' },
      ],
      activeQuestionId: '1',
      previewMode: 'typeform',
      hidePreview: false,

      setName: (name) => set({ name }),
      setDescription: (description) => set({ description }),
      setQuestions: (questions) => set({ questions }),
      setActiveQuestionId: (activeQuestionId) => set({ activeQuestionId }),
      setPreviewMode: (previewMode) => set({ previewMode }),
      setHidePreview: (hidePreview) => set({ hidePreview }),

      updateQuestion: (id, updates) => set((state) => ({
        questions: state.questions.map((q) => q.id === id ? { ...q, ...updates } : q)
      })),

      addQuestion: (question, index) => set((state) => {
        const newQuestions = [...state.questions]
        newQuestions.splice(index, 0, question)
        return { questions: newQuestions, activeQuestionId: question.id }
      }),

      deleteQuestion: (id) => set((state) => {
        const newQuestions = state.questions.filter((q) => q.id !== id)
        const nextActiveId = state.activeQuestionId === id 
          ? (newQuestions[0]?.id || null) 
          : state.activeQuestionId
        return { questions: newQuestions, activeQuestionId: nextActiveId }
      }),
    }),
    {
      name: 'form-builder-storage',
    }
  )
)
