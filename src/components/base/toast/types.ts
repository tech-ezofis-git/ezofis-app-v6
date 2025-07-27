export interface Toast {
  message: string
  variant?: ToastVariant
}

export type ToastVariant = 'default' | 'error' | 'success' | 'warning'
