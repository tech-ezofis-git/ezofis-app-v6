import { Notifications as Primitive } from '@mantine/notifications'

const Toasts = () => {
  return (
    <Primitive
      classNames={{
        notification:
          'border border-gray-100 bg-surface-emphasized p-4 shadow-xl before:w-0 dark:border-gray-150',
      }}
    />
  )
}

export default Toasts
