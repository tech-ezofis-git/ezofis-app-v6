import { createFileRoute, Outlet } from '@tanstack/react-router'
import SomethingWentWrong from '@/components/common/SomethingWentWrong'
import ThemeSwitcher from '@/routes/stories/-components/ThemeSwitcher'

export const Route = createFileRoute('/stories')({
  component: RouteComponent,
  errorComponent: () => <SomethingWentWrong />,
})

function RouteComponent() {
  return (
    <div className='container mx-auto p-6 pb-20'>
      <div className='mb-12 flex items-center justify-between'>
        <h1 className='text-20 font-bold text-gray-13'>Components</h1>
        <ThemeSwitcher />
      </div>
      <Outlet />
    </div>
  )
}
