import { Notifications as Base } from '@mantine/notifications'

const Toasts = () => {
  return (
    <Base
      classNames={{
        notification:
          'border border-gray-600/10 bg-surface-raised p-4 shadow-xl before:w-0',
      }}
    />
  )
}

Toasts.displayName = 'Toasts'
export default Toasts
