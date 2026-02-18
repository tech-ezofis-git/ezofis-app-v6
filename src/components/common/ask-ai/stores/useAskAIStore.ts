import { create } from 'zustand'
import { generateFormFields } from '@/services/ai/gemini'
import { useFormStore } from '@/pages/form-builder/store/formStore'

type Store = {
  isMaximized: boolean
  isOpen: boolean
  isLoading: boolean
  suggestion: string
  suggestions: string[]
  close: () => void
  open: () => void
  setSuggestion: (suggestion: string) => void
  toggleMaximize: () => void
  sendMessage: (prompt: string) => Promise<void>
}

const useAskAIStore = create<Store>((set) => ({
  isMaximized: false,
  isOpen: false,
  isLoading: false,
  suggestion: '',
  suggestions: [
    'Create a customer feedback form.',
    'Build a registration form for an event.',
    'Design a job application form.',
    'Make a contact us form with email validation.',
    'Generate a product survey with rating fields.',
  ],
  close: () => set({ isOpen: false }),
  open: () => set({ isOpen: true }),
  toggleMaximize: () =>
    set(({ isMaximized }) => ({ isMaximized: !isMaximized })),
  setSuggestion: (suggestion: string) => set({ suggestion }),
  sendMessage: async (prompt: string) => {
    if (!prompt.trim()) return

    set({ isLoading: true })
    try {
      const questions = await generateFormFields(prompt)
      useFormStore.getState().setQuestions(questions)
      // Optionally rename the form based on a simple heuristic or ask AI for a title too
      // For now, let's keep it simple
      set({ isOpen: false, suggestion: '' }) 
    } catch (error) {
      console.error(error)
      // minimal error handling
    } finally {
      set({ isLoading: false })
    }
  }
}))

export default useAskAIStore
