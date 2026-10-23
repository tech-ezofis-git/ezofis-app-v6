import type { KeyboardEvent } from 'react'

/**
 * Inline-editable value. At rest a dashed underline marks it as editable; on
 * hover or keyboard focus it turns into a tinted, outlined field so it reads
 * like an input. Clicking it (or Enter / Space) opens the editor — no
 * separate pencil icon.
 */
export const editableValueClass =
  'cursor-text rounded-md border border-transparent px-1.5 py-0.5 -mx-1.5 -my-0.5 outline-none underline decoration-dashed decoration-gray-7 decoration-1 underline-offset-4 transition-[background-color,border-color,box-shadow,text-decoration-color] duration-150 hover:border-[var(--primary-7)] hover:bg-[var(--primary-2)] hover:decoration-transparent hover:shadow-xs focus-visible:border-[var(--primary-8)] focus-visible:bg-[var(--primary-2)] focus-visible:decoration-transparent focus-visible:ring-2 focus-visible:ring-[var(--primary-5)] active:bg-[var(--primary-3)]'

/** Enter / Space on a focused editable value opens its editor. */
export const onEditableValueKeyDown =
  (open: () => void) => (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    open()
  }
