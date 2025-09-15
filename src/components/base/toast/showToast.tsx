import { notifications } from '@mantine/notifications'
import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'
import type { Toast } from './types'

const variants = {
  default: {
    className: 'text-primary-11',
    icon: 'tabler:info-circle-filled',
    title: 'Info!',
  },
  error: {
    className: 'text-red-11',
    icon: 'tabler:circle-x-filled',
    title: 'Error!',
  },
  success: {
    className: 'text-green-11',
    icon: 'tabler:circle-check-filled',
    title: 'Success!',
  },
  warning: {
    className: 'text-orange-11',
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
