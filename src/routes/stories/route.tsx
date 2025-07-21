import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/stories')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className='container mx-auto p-6 pb-20'>
      <h1 className='mb-10 text-2xl font-bold text-gray-900'>Components</h1>
      <Outlet />
    </div>
  )
}
