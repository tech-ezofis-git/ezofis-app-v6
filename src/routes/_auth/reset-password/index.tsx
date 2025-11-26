import { createFileRoute } from '@tanstack/react-router'
import ResetPasswordPage from '@/pages/reset-password/ResetPasswordPage'

export const Route = createFileRoute('/_auth/reset-password/')({
  component: RouteComponent,
  staticData: {
    pageTitle: 'Reset Password',
  },
})

function RouteComponent() {
  return <ResetPasswordPage />
}
