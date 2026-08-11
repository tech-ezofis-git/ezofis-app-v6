import { Notifications as Base } from '@mantine/notifications'

const Toasts = () => {
  return (
    <Base
      classNames={{
        notification:
          'border border-gray-3 bg-surface-raised shadow-md before:w-1',
      }}
    />
  )
}

Toasts.displayName = 'Toasts'
export default Toasts
