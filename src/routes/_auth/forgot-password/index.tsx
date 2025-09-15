import { createFileRoute } from '@tanstack/react-router'
import ForgotPasswordPage from '@/pages/forgot-password/ForgotPasswordPage'

export const Route = createFileRoute('/_auth/forgot-password/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <ForgotPasswordPage />
}
