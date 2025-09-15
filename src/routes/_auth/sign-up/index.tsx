import { createFileRoute } from '@tanstack/react-router'
import SignUpPage from '@/pages/sign-up/SignUpPage'

export const Route = createFileRoute('/_auth/sign-up/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <SignUpPage />
}
