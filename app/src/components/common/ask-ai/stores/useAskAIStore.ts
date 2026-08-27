import { create } from 'zustand'
import { useFormStore } from '@/pages/form-builder/store/formStore'
import {
  buildFormPayloadFromAiSuggestion,
  processFormAssistantPrompt,
} from '@/services/ai/formConfig'

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
    'Add a Phone Number and Address field.',
    'Make the Email field mandatory.',
    'What fields are in this form?',
    'Change the form name to Customer Feedback.',
    'Add a new section for Attachments.',
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
      const formState = useFormStore.getState()
      const result = await processFormAssistantPrompt({
        formState,
        userPrompt: prompt,
      })

      let payload: any = null
      if (result.action === 'UPDATE' || result.action === 'REMOVE_FORM') {
        payload = buildFormPayloadFromAiSuggestion(result)
        useFormStore.getState().appendAIResponse(payload)
      }

      set((state) => ({
        messages: [
          ...state.messages,
          {
            content:
              result.reply ||
              (result.action === 'REMOVE_FORM'
                ? 'I have removed the form.'
                : result.action === 'UPDATE'
                  ? 'I have updated your form structure.'
                  : 'Here is the information about your form.'),
            data: payload,
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
              'Sorry, I encountered an error while processing your request. Please try again.',
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
