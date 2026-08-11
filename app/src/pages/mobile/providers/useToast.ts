import showToast from '@/components/base/toast/showToast'
import type { ToastVariant } from '@/components/base/toast/types'

type ToastInput = {
  message: string
  title?: string
  variant?: ToastVariant
}

export function useToast() {
  return {
    toast: ({ message, title, variant = 'success' }: ToastInput) =>
      showToast({
        message,
        toastTitle: title,
        variant,
      }),
  }
}
