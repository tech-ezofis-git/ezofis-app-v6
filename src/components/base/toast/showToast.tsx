import { notifications } from '@mantine/notifications'
import Icon from '@/components/base/Icon'
import cn from '@/utils/cn'
import type { Toast } from './types'

const variants = {
  default: {
    className: 'text-primary',
    icon: 'tabler:info-circle-filled',
    title: 'Info!',
  },
  error: {
    className: 'text-red',
    icon: 'tabler:circle-x-filled',
    title: 'Error!',
  },
  success: {
    className: 'text-green',
    icon: 'tabler:circle-check-filled',
    title: 'Success!',
  },
  warning: {
    className: 'text-orange',
    icon: 'tabler:alert-circle-filled',
    title: 'Warning!',
  },
}

const showToast = ({ message, variant = 'default' }: Toast) => {
  const { className, icon, title } = variants[variant]

  return notifications.show({
    icon: <Icon className={cn('size-7', className)} name={icon} />,
    message,
    title,
  })
}

export default showToast
