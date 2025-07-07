interface Toast {
  message: string
  type?: ToastType
}

type ToastType = 'default' | 'error' | 'success' | 'warning'

export type { Toast, ToastType }
