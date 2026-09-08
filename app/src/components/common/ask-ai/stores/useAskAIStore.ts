import { create } from 'zustand'
import { useFormStore } from '@/pages/form-builder/store/formStore'
import {
  buildFormPayloadFromAiSuggestion,
  processFormAssistantPrompt,
} from '@/services/ai/formConfig'

// Generic, category-level prompts only - no concrete field names or actions
// (e.g. never "Add a Phone Number field"). Clicking one doesn't call the AI;
// it shows a canned clarifying question from the frontend so the AI only
// runs once the user has said what they actually want (see sendSuggestion).
const GENERIC_SUGGESTIONS: { clarification: string; label: string }[] = [
  {
    clarification:
      'Sure — what type of field would you like to add (e.g. text, email, phone, date, dropdown), what should it be labeled, and which section should it go in?',
    label: 'Add a new field',
  },
  {
    clarification:
      'Which field would you like to update, and what should change (e.g. make it required, add validation, rename it)?',
    label: 'Update an existing field',
  },
  {
    clarification:
      'What should the new section be called, and should I add any fields to it right away?',
    label: 'Add a new section',
  },
  {
    clarification:
      'What would you like to know — its fields, sections, validation rules, or something else?',
    label: 'Ask about my form',
  },
]

type Store = {
  credits: number
  isLoading: boolean
  isMaximized: boolean
  isOpen: boolean
  /** Path active when full-view opened — restore on minimize/close if no menu picked. */
  returnPath: string | null
  /** Menu selected while AI is full-view — preferred restore target. */
  pendingPath: string | null
  messages: { content: string; data?: any; role: 'user' | 'assistant' }[]
  suggestion: string
  suggestions: string[]
  close: () => string | null
  /** Leave full-view (keep chat open as side panel). Used when picking a sidebar menu. */
  exitFullView: () => void
  open: () => void
  sendMessage: (prompt: string) => Promise<void>
  sendSuggestion: (label: string) => void
  setPendingPath: (path: string | null) => void
  setSuggestion: (suggestion: string) => void
  /** Expand/collapse. Pass current pathname when expanding. Returns path to navigate on collapse. */
  toggleMaximize: (currentPath?: string) => string | null
}

const useAskAIStore = create<Store>((set, get) => ({
  credits: 15,
  isLoading: false,
  isMaximized: false,
  isOpen: false,
  messages: [],
  pendingPath: null,
  returnPath: null,
  suggestion: '',
  suggestions: GENERIC_SUGGESTIONS.map((s) => s.label),
  close: () => {
    const { isMaximized, pendingPath, returnPath } = get()
    const dest = isMaximized ? pendingPath || returnPath : null
    set({
      isMaximized: false,
      isOpen: false,
      pendingPath: null,
      returnPath: null,
    })
    return dest
  },
  exitFullView: () =>
    set({
      isMaximized: false,
      pendingPath: null,
      returnPath: null,
    }),
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
  sendSuggestion: (label: string) => {
    const option = GENERIC_SUGGESTIONS.find((s) => s.label === label)
    set((state) => ({
      messages: [
        ...state.messages,
        { content: label, role: 'user' as const },
        {
          content:
            option?.clarification ??
            'Could you tell me a bit more about what you need?',
          role: 'assistant' as const,
        },
      ],
    }))
  },
  setPendingPath: (path) => set({ pendingPath: path }),
  setSuggestion: (suggestion: string) => set({ suggestion }),
  toggleMaximize: (currentPath) => {
    const { isMaximized, pendingPath, returnPath } = get()
    if (!isMaximized) {
      set({
        isMaximized: true,
        pendingPath: null,
        returnPath: currentPath || returnPath || null,
      })
      return null
    }
    const dest = pendingPath || returnPath
    set({ isMaximized: false, pendingPath: null, returnPath: null })
    return dest
  },
}))

export default useAskAIStore
