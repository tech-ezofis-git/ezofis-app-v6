import { notifications } from '@mantine/notifications'
import cn from '@/utils/cn'
import type { Toast } from './types'

const variants = {
  default: {
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

const showToast = ({
  autoClose,
  message,
  toastTitle,
  variant = 'default',
}: Toast) => {
  const { title } = toastTitle ? { title: toastTitle } : variants[variant]

  return notifications.show({
    autoClose: autoClose ?? 4000,
    className: cn(variants[variant].className, 'mt-4'),
    message,
    title,
    withCloseButton: true,
  })
}

export default showToast
