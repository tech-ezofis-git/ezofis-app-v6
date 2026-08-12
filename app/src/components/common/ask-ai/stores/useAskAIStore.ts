import { create } from 'zustand'
import { useFormStore } from '@/pages/form-builder/store/formStore'

type Store = {
  credits: number
  isLoading: boolean
  isMaximized: boolean
  isOpen: boolean
  messages: { content: string; data?: any; role: 'user' | 'assistant' }[]
  suggestion: string
  suggestions: string[]
  close: () => void
  open: () => void
  sendMessage: (prompt: string) => Promise<void>
  setSuggestion: (suggestion: string) => void
  toggleMaximize: () => void
}

const useAskAIStore = create<Store>((set, get) => ({
  credits: 15,
  isLoading: false,
  isMaximized: false,
  isOpen: false,
  messages: [],
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
  sendMessage: async (prompt: string) => {
    if (!prompt.trim()) return

    const currentMessages = get().messages
    const newMessages = [
      ...currentMessages,
      { content: prompt, role: 'user' as const },
    ]

    set({
      credits: Math.max(0, get().credits - 1),
      isLoading: true,
      messages: newMessages,
    })

    try {
      const response = await fetch(
        'https://form-builder-ai-seven.vercel.app/api/generate-form',
        {
          body: JSON.stringify({ prompt }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        },
      )

      if (!response.ok) throw new Error('Failed to generate form')

      const data = await response.json()
      useFormStore.getState().appendAIResponse(data)

      set((state) => ({
        messages: [
          ...state.messages,
          {
            content:
              'I have generated the form structure for you. You can see the details below:',
            data,
            role: 'assistant' as const,
          },
        ],
        suggestion: '',
      }))
    } catch (error) {
      console.error('AI Form Generation Error:', error)
      set((state) => ({
        messages: [
          ...state.messages,
          {
            content:
              'Sorry, I encountered an error while generating your form. Please try again.',
            role: 'assistant' as const,
          },
        ],
      }))
    } finally {
      set({ isLoading: false })
    }
  },
  toggleMaximize: () =>
    set(({ isMaximized }) => ({ isMaximized: !isMaximized })),
  setSuggestion: (suggestion: string) => set({ suggestion }),
}))

export default useAskAIStore
