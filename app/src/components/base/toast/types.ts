import type { ReactNode } from 'react'

export interface Toast {
  message: ReactNode
  autoClose?: number | false
  // Toasts with the same id replace each other: only the latest one is shown.
  id?: string
  // Keep the given variant even for a mandatory-field message (which is
  // otherwise shown as info).
  keepVariant?: boolean
  // Shows a spinner instead of the colour bar and no close button. Pair with
  // `autoClose: false` and replace it (same `id`) when the work is done.
  loading?: boolean
  toastTitle?: string
  variant?: ToastVariant
}

export type ToastVariant = 'default' | 'error' | 'success' | 'warning' | 'info'
