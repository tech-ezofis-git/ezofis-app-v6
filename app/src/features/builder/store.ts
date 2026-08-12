import { create } from 'zustand'
import { persist } from 'zustand/middleware'
// import { t } from '@lingui/macro'

export interface Field {
  hidden: boolean
  id: string
  readOnly: boolean
  required: boolean
  title: string
  type: FieldType
  width: FieldWidth
  description?: string
  options?: string[]
  placeholder?: string
}

export type FieldType =
  | 'short_text'
  | 'long_text'
  | 'number'
  | 'email'
  | 'upload_po'
  | 'choices'
  | 'date'
  | 'divider'

export type FieldWidth = 'full' | '1/2' | '1/3'

export interface Page {
  fields: Field[]
  id: string
  title: string
}

interface FormHistory {
  future: FormState[]
  past: FormState[]
}

interface FormState {
  activeFieldId: string | null
  isDragging: boolean
  isPreviewMode: boolean
  pages: Page[]
  title: string
}

interface FormStore extends FormState, FormHistory {
  // Field Actions
  addField: (pageId: string, index?: number) => void
  deleteField: (id: string) => void
  duplicateField: (id: string) => void
  moveField: (id: string, toPageId: string, index: number) => void

  redo: () => void
  saveHistory: () => void
  // History Actions
  undo: () => void
  updateField: (id: string, data: Partial<Field>) => void
  updatePage: (id: string, updates: Partial<Page>) => void
  setActiveFieldId: (id: string | null) => void

  setIsDragging: (isDragging: boolean) => void
  setIsPreviewMode: (isPreview: boolean) => void
  // Actions
  setTitle: (title: string) => void
}

const initialState: FormState = {
  activeFieldId: null,
  isDragging: false,
  isPreviewMode: false,
  pages: [
    {
      fields: [
        {
          hidden: false,
          id: 'field-1',
          readOnly: false,
          required: false,
          title: 'Welcome Question',
          type: 'short_text',
          width: 'full',
        },
      ],
      id: 'page-1',
      title: 'Page 1',
    },
  ],
  title: 'Untitled Form',
}

export const useFormStore = create<FormStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      future: [],
      past: [],

      addField: (pageId, index) => {
        get().saveHistory()
        const newField: Field = {
          hidden: false,
          id: crypto.randomUUID(),
          readOnly: false,
          required: false,
          title: 'New Question',
          type: 'short_text',
          width: 'full',
        }

        set((state) => ({
          activeFieldId: newField.id,
          pages: state.pages.map((p) => {
            if (p.id !== pageId) return p
            const newFields = [...p.fields]
            if (typeof index === 'number') {
              newFields.splice(index, 0, newField)
            } else {
              newFields.push(newField)
            }
            return { ...p, fields: newFields }
          }),
        }))
      },

      deleteField: (id: string) => {
        get().saveHistory()
        set((state) => ({
          activeFieldId:
            state.activeFieldId === id ? null : state.activeFieldId,
          pages: state.pages.map((p) => ({
            ...p,
            fields: p.fields.filter((f) => f.id !== id),
          })),
        }))
      },

      duplicateField: (id) => {
        get().saveHistory()
        set((state) => ({
          pages: state.pages.map((p) => {
            const fieldIndex = p.fields.findIndex((f) => f.id === id)
            if (fieldIndex === -1) return p

            const field = p.fields[fieldIndex]
            const newField = {
              ...field,
              id: crypto.randomUUID(),
              title: `${field.title} (Copy)`,
            }
            const newFields = [...p.fields]
            newFields.splice(fieldIndex + 1, 0, newField)
            return { ...p, fields: newFields }
          }),
        }))
      },

      moveField: (id, toPageId, index) => {
        get().saveHistory()
        set((state) => {
          let fieldToMove: Field | undefined
          const newPages = state.pages.map((p) => {
            const foundField = p.fields.find((f) => f.id === id)
            if (foundField) {
              fieldToMove = foundField
              return { ...p, fields: p.fields.filter((f) => f.id !== id) }
            }
            return p
          })

          if (!fieldToMove) return state

          return {
            pages: newPages.map((p) => {
              if (p.id !== toPageId) return p
              const newFields = [...p.fields]
              newFields.splice(index, 0, fieldToMove!)
              return { ...p, fields: newFields }
            }),
          }
        })
      },

      redo: () => {
        const {
          activeFieldId,
          future,
          isDragging,
          isPreviewMode,
          pages,
          past,
          title,
        } = get()
        if (future.length === 0) return

        const nextState = future[0]
        const newFuture = future.slice(1)
        const currentState: FormState = {
          activeFieldId,
          isDragging,
          isPreviewMode,
          pages,
          title,
        }

        set({
          ...nextState,
          future: newFuture,
          past: [...past, currentState],
        })
      },
      saveHistory: () => {
        const { activeFieldId, isDragging, isPreviewMode, pages, past, title } =
          get()
        const currentState: FormState = {
          activeFieldId,
          isDragging,
          isPreviewMode,
          pages,
          title,
        }

        // Prevent saving redundant history
        if (past.length > 0) {
          const lastState = past[past.length - 1]
          if (JSON.stringify(lastState) === JSON.stringify(currentState)) return
        }

        set({
          future: [],
          past: [...past, currentState].slice(-20), // Keep last 20 steps
        })
      },
      undo: () => {
        const {
          activeFieldId,
          future,
          isDragging,
          isPreviewMode,
          pages,
          past,
          title,
        } = get()
        if (past.length === 0) return

        const previousState = past[past.length - 1]
        const newPast = past.slice(0, past.length - 1)
        const currentState: FormState = {
          activeFieldId,
          isDragging,
          isPreviewMode,
          pages,
          title,
        }

        set({
          ...previousState,
          future: [currentState, ...future],
          past: newPast,
        })
      },

      updateField: (id, data) => {
        get().saveHistory()
        set((state) => ({
          pages: state.pages.map((p) => ({
            ...p,
            fields: p.fields.map((f) => (f.id === id ? { ...f, ...data } : f)),
          })),
        }))
      },

      updatePage: (id, updates) => {
        get().saveHistory()
        set((state) => ({
          pages: state.pages.map((p) =>
            p.id === id ? { ...p, ...updates } : p,
          ),
        }))
      },

      setActiveFieldId: (activeFieldId) => set({ activeFieldId }),

      setIsDragging: (isDragging) => set({ isDragging }),

      setIsPreviewMode: (isPreviewMode) => set({ isPreviewMode }),

      setTitle: (title) => {
        get().saveHistory()
        set({ title })
      },
    }),
    {
      name: 'form-builder-storage-v2',
      partialize: (state) => ({
        pages: state.pages,
        title: state.title,
      }),
    },
  ),
)
