import { Notifications as Base } from '@mantine/notifications'

const Toasts = () => {
  return (
    <Base
      classNames={{
        notification:
          'border border-gray-4 bg-surface-raised p-4 shadow-lg before:w-0',
      }}
    />
  )
}

Toasts.displayName = 'Toasts'
export default Toasts
