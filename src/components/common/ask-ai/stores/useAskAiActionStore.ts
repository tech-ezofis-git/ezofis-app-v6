import { create } from 'zustand'
import type { AskAiPageContext, AskAiPendingAction } from '../types'

type AskAiActionStore = {
  clearContext: () => void
  clearPending: () => void
  consumePending: (
    target?: AskAiPendingAction['target'],
  ) => AskAiPendingAction | null
  pageContext: AskAiPageContext | null
  pending: AskAiPendingAction | null
  setPageContext: (context: AskAiPageContext | null) => void
  setPending: (action: AskAiPendingAction | null) => void
}

const useAskAiActionStore = create<AskAiActionStore>((set, get) => ({
  pageContext: null,
  pending: null,

  clearContext: () => set({ pageContext: null }),

  clearPending: () => set({ pending: null }),

  consumePending: (target) => {
    const current = get().pending
    if (!current) return null
    if (target && current.target !== target) return null
    set({ pending: null })
    return current
  },

  setPageContext: (context) => set({ pageContext: context }),

  setPending: (action) => set({ pending: action }),
}))

export default useAskAiActionStore
