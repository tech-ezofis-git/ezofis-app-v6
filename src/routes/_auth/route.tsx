import { createFileRoute, Outlet } from '@tanstack/react-router'
import AuthLayout from '@/layouts/auth/AuthLayout'

export const Route = createFileRoute('/_auth')({
  component: RouteComponent,
  staticData: {
    pageTitle: 'Auth Layout',
  },
})

function RouteComponent() {
  return (
    <AuthLayout>
      <Outlet />
    </AuthLayout>
  )
}
