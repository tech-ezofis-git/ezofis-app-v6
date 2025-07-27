import { createFileRoute } from '@tanstack/react-router'
import SomethingWentWrong from '@/components/common/SomethingWentWrong'
import ThemeSwitcher from '@/routes/stories/-components/ThemeSwitcher'

export const Route = createFileRoute('/')({
  component: RouteComponent,
  errorComponent: () => <SomethingWentWrong />,
})

function RouteComponent() {
  return (
    <div className='flex min-h-screen'>
      <ThemeSwitcher className='fixed top-6 right-6' />

      <div className='mx-auto mt-6 hidden w-86 rounded-md border border-gray-600/5 bg-surface-raised p-6'></div>
    </div>
  )
}
