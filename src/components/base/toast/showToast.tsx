import { notifications } from '@mantine/notifications'
import cn from '@/utils/cn'
import type { Toast } from './types'

const variants = {
  default: {
    className: 'before:bg-primary-9',
    title: 'Info',
  },
  error: {
    className: 'before:bg-red-9',
    title: 'Error',
  },
  success: {
    className: 'before:bg-green-9',
    title: 'Success',
  },
  warning: {
    className: 'before:bg-orange-9',
    title: 'Warning',
  },
}

const showToast = ({ message, variant = 'default' }: Toast) => {
  const { title } = variants[variant]

  return notifications.show({
    className: cn(variants[variant].className, 'mt-4'),
    message,
    title,
  })
}

export default showToast
