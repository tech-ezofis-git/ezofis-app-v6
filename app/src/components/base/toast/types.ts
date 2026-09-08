import type { ReactNode } from 'react'

export interface Toast {
  autoClose?: number | false
  message: ReactNode
  toastTitle?: string
  variant?: ToastVariant
}

export type ToastVariant = 'default' | 'error' | 'success' | 'warning'
