import { createFileRoute } from '@tanstack/react-router'
import SomethingWentWrong from '@/components/common/SomethingWentWrong'
import ThemeSwitcher from '@/routes/stories/-components/ThemeSwitcher'

export const Route = createFileRoute('/')({
  component: RouteComponent,
  errorComponent: () => <SomethingWentWrong />,
})

function RouteComponent() {
  return (
    <div className='flex'>
      <ThemeSwitcher className='fixed top-6 right-6' />

      {/* <div className='h-screen w-64 border-r border-gray-600/10 bg-surface p-6'></div>
      <div className='h-screen flex-1 bg-surface-muted p-6'></div> */}
    </div>
  )
}
