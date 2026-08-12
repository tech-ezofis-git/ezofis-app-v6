export interface Toast {
  message: string
  toastTitle?: string
  variant?: ToastVariant
}

export type ToastVariant = 'default' | 'error' | 'success' | 'warning'
