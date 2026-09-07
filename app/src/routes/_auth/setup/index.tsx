import { createFileRoute } from '@tanstack/react-router'
import ResetPasswordPage from '@/pages/reset-password/ResetPasswordPage'

export const Route = createFileRoute('/_auth/setup/')({
  component: RouteComponent,
  staticData: {
    pageTitle: 'Complete Setup',
  },
})

function RouteComponent() {
  return <ResetPasswordPage />
}
