import type { ReactNode } from 'react'

export interface Toast {
  message: ReactNode
  autoClose?: number | false
  toastTitle?: string
  variant?: ToastVariant
}

export type ToastVariant = 'default' | 'error' | 'success' | 'warning' | 'info'
