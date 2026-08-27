import { createFileRoute } from '@tanstack/react-router'
import ForgotPasswordPage from '@/pages/forgot-password/ForgotPasswordPage'

export const Route = createFileRoute('/_auth/recover/')({
  component: RouteComponent,
  staticData: {
    pageTitle: 'Forgot Password',
  },
})

function RouteComponent() {
  return <ForgotPasswordPage />
}
