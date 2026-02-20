import { create } from 'zustand'
import { persist } from 'zustand/middleware'
// import { t } from '@lingui/macro'

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

export interface Field {
  id: string
  title: string
  description?: string
  placeholder?: string
  type: FieldType
  required: boolean
  hidden: boolean
  readOnly: boolean
  width: FieldWidth
  options?: string[]
}

export interface Page {
  id: string
  title: string
  fields: Field[]
}

interface FormState {
  title: string
  pages: Page[]
  activeFieldId: string | null
  isDragging: boolean
  isPreviewMode: boolean
}

interface FormHistory {
  past: FormState[]
  future: FormState[]
}

interface FormStore extends FormState, FormHistory {
  // Actions
  setTitle: (title: string) => void
  setActiveFieldId: (id: string | null) => void
  setIsDragging: (isDragging: boolean) => void
  setIsPreviewMode: (isPreview: boolean) => void
  
  // Field Actions
  addField: (pageId: string, index?: number) => void
  updateField: (id: string, data: Partial<Field>) => void
  moveField: (id: string, toPageId: string, index: number) => void
  duplicateField: (id: string) => void
  deleteField: (id: string) => void
  updatePage: (id: string, updates: Partial<Page>) => void
  
  // History Actions
  undo: () => void
  redo: () => void
  saveHistory: () => void
}

const initialState: FormState = {
  title: 'Untitled Form',
  pages: [
    {
      id: 'page-1',
      title: 'Page 1',
      fields: [
        {
          id: 'field-1',
          type: 'short_text',
          title: 'Welcome Question',
          required: false,
          hidden: false,
          readOnly: false,
          width: 'full'
        }
      ]
    }
  ],
  activeFieldId: null,
  isDragging: false,
  isPreviewMode: false
}

export const useFormStore = create<FormStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      past: [],
      future: [],

      saveHistory: () => {
        const { past, title, pages, activeFieldId, isDragging, isPreviewMode } = get()
        const currentState: FormState = { title, pages, activeFieldId, isDragging, isPreviewMode }
        
        // Prevent saving redundant history
        if (past.length > 0) {
          const lastState = past[past.length - 1]
          if (JSON.stringify(lastState) === JSON.stringify(currentState)) return
        }

        set({
          past: [...past, currentState].slice(-20), // Keep last 20 steps
          future: []
        })
      },

      undo: () => {
        const { past, future, title, pages, activeFieldId, isDragging, isPreviewMode } = get()
        if (past.length === 0) return

        const previousState = past[past.length - 1]
        const newPast = past.slice(0, past.length - 1)
        const currentState: FormState = { title, pages, activeFieldId, isDragging, isPreviewMode }

        set({
          ...previousState,
          past: newPast,
          future: [currentState, ...future]
        })
      },

      redo: () => {
        const { past, future, title, pages, activeFieldId, isDragging, isPreviewMode } = get()
        if (future.length === 0) return

        const nextState = future[0]
        const newFuture = future.slice(1)
        const currentState: FormState = { title, pages, activeFieldId, isDragging, isPreviewMode }

        set({
          ...nextState,
          past: [...past, currentState],
          future: newFuture
        })
      },

      setTitle: (title) => {
        get().saveHistory()
        set({ title })
      },

      setActiveFieldId: (activeFieldId) => set({ activeFieldId }),
      setIsDragging: (isDragging) => set({ isDragging }),
      setIsPreviewMode: (isPreviewMode) => set({ isPreviewMode }),

      addField: (pageId, index) => {
        get().saveHistory()
        const newField: Field = {
          id: crypto.randomUUID(),
          title: 'New Question',
          type: 'short_text',
          required: false,
          hidden: false,
          readOnly: false,
          width: 'full'
        }

        set((state) => ({
          pages: state.pages.map(p => {
            if (p.id !== pageId) return p
            const newFields = [...p.fields]
            if (typeof index === 'number') {
              newFields.splice(index, 0, newField)
            } else {
              newFields.push(newField)
            }
            return { ...p, fields: newFields }
          }),
          activeFieldId: newField.id
        }))
      },

      updateField: (id, data) => {
        get().saveHistory()
        set((state) => ({
          pages: state.pages.map(p => ({
            ...p,
            fields: p.fields.map(f => f.id === id ? { ...f, ...data } : f)
          }))
        }))
      },

      moveField: (id, toPageId, index) => {
        get().saveHistory()
        set((state) => {
          let fieldToMove: Field | undefined
          const newPages = state.pages.map(p => {
            const foundField = p.fields.find(f => f.id === id)
            if (foundField) {
              fieldToMove = foundField
              return { ...p, fields: p.fields.filter(f => f.id !== id) }
            }
            return p
          })

          if (!fieldToMove) return state

          return {
            pages: newPages.map(p => {
              if (p.id !== toPageId) return p
              const newFields = [...p.fields]
              newFields.splice(index, 0, fieldToMove!)
              return { ...p, fields: newFields }
            })
          }
        })
      },

      duplicateField: (id) => {
        get().saveHistory()
        set((state) => ({
          pages: state.pages.map(p => {
            const fieldIndex = p.fields.findIndex(f => f.id === id)
            if (fieldIndex === -1) return p
            
            const field = p.fields[fieldIndex]
            const newField = { ...field, id: crypto.randomUUID(), title: `${field.title} (Copy)` }
            const newFields = [...p.fields]
            newFields.splice(fieldIndex + 1, 0, newField)
            return { ...p, fields: newFields }
          })
        }))
      },

      deleteField: (id: string) => {
        get().saveHistory()
        set((state) => ({
          pages: state.pages.map(p => ({
            ...p,
            fields: p.fields.filter(f => f.id !== id)
          })),
          activeFieldId: state.activeFieldId === id ? null : state.activeFieldId
        }))
      },

      updatePage: (id, updates) => {
        get().saveHistory()
        set((state) => ({
          pages: state.pages.map(p => p.id === id ? { ...p, ...updates } : p)
        }))
      }
    }),
    {
      name: 'form-builder-storage-v2',
      partialize: (state) => ({
        title: state.title,
        pages: state.pages
      })
    }
  )
)
