export interface Toast {
  message: string
  variant?: ToastVariant
  toastTitle?: string
}

export type ToastVariant = 'default' | 'error' | 'success' | 'warning'
