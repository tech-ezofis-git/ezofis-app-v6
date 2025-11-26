import { createFileRoute, Outlet } from '@tanstack/react-router'
import AppLayout from '@/layouts/app/AppLayout'

export const Route = createFileRoute('/_app')({
  component: RouteComponent,
  staticData: {
    pageTitle: 'App Layout',
  },
})

function RouteComponent() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  )
}
