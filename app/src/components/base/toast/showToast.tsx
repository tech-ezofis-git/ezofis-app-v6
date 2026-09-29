import type { ReactNode } from 'react'
import { notifications } from '@mantine/notifications'
import cn from '@/utils/cn'
import type { Toast, ToastVariant } from './types'

const variants = {
  default: {
    className: 'before:bg-blue-9 bg-blue-3',
    title: 'Info',
  },
  info: {
    className: 'before:bg-blue-9 bg-blue-3',
    title: 'Info',
  },
  error: {
    className: 'before:bg-red-9 bg-red-3',
    title: 'Error',
  },
  success: {
    className: 'before:bg-green-9 bg-green-3',
    title: 'Success',
  },
  warning: {
    className: 'before:bg-orange-9 bg-orange-3',
    title: 'Warning',
  },
}

function isMandatoryValidationMessage(
  message: ReactNode,
  title?: string,
): boolean {
  const text = `${typeof message === 'string' ? message : ''} ${title || ''}`.toLowerCase()
  return (
    text.includes('required') ||
    text.includes('mandatory') ||
    text.includes('missing') ||
    text.includes('cannot be empty') ||
    text.includes("can't be empty") ||
    text.includes('is empty') ||
    text.includes('not filled') ||
    text.includes('not filling') ||
    text.includes('please fill') ||
    text.includes('please enter') ||
    text.includes('please select') ||
    text.includes('please choose') ||
    text.includes('please provide') ||
    text.includes('please complete') ||
    text.includes('please specify') ||
    text.includes('please attach') ||
    text.includes('please upload') ||
    text.includes('must be entered') ||
    text.includes('must be provided') ||
    text.includes('must be selected') ||
    text.includes('must be filled')
  )
}

const showToast = ({
  autoClose,
  message,
  toastTitle,
  variant = 'default',
}: Toast) => {
  // Any mandatory not filling message must only be in info toast, not error toast
  const isMandatoryNotice =
    variant === 'error' && isMandatoryValidationMessage(message, toastTitle)
  const resolvedVariant: ToastVariant = isMandatoryNotice ? 'info' : variant

  const variantConfig = variants[resolvedVariant] || variants.default
  const title =
    isMandatoryNotice && toastTitle?.toLowerCase() === 'error'
      ? variantConfig.title
      : (toastTitle ?? variantConfig.title)

  return notifications.show({
    autoClose: autoClose ?? 4000,
    className: cn(variantConfig.className, 'mt-4'),
    message,
    title,
    withCloseButton: true,
  })
}

export default showToast
