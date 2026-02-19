import { create } from 'zustand'
import { useFormStore } from '@/pages/form-builder/store/formStore'

type Store = {
  isMaximized: boolean
  isOpen: boolean
  isLoading: boolean
  suggestion: string
  suggestions: string[]
  credits: number
  messages: { role: 'user' | 'assistant', content: string, data?: any }[]
  close: () => void
  open: () => void
  setSuggestion: (suggestion: string) => void
  toggleMaximize: () => void
  sendMessage: (prompt: string) => Promise<void>
}

const useAskAIStore = create<Store>((set, get) => ({
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
  credits: 15,
  messages: [],
  close: () => set({ isOpen: false }),
  open: () => set({ isOpen: true }),
  toggleMaximize: () =>
    set(({ isMaximized }) => ({ isMaximized: !isMaximized })),
  setSuggestion: (suggestion: string) => set({ suggestion }),
  sendMessage: async (prompt: string) => {
    if (!prompt.trim()) return

    const currentMessages = get().messages
    const newMessages = [...currentMessages, { role: 'user' as const, content: prompt }]
    
    set({ isLoading: true, messages: newMessages, credits: Math.max(0, get().credits - 1) })
    
    try {
      const response = await fetch('http://localhost:5000/api/generate-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      })

      if (!response.ok) throw new Error('Failed to generate form')
      
      const data = await response.json()
      useFormStore.getState().appendAIResponse(data)
      
      set((state) => ({ 
        messages: [
          ...state.messages, 
          { 
            role: 'assistant' as const, 
            content: 'I have generated the form structure for you. You can see the details below:',
            data 
          }
        ],
        suggestion: '' 
      })) 
    } catch (error) {
      console.error('AI Form Generation Error:', error)
      set((state) => ({
        messages: [
          ...state.messages,
          { role: 'assistant' as const, content: 'Sorry, I encountered an error while generating your form. Please try again.' }
        ]
      }))
    } finally {
      set({ isLoading: false })
    }
  }
}))

export default useAskAIStore
