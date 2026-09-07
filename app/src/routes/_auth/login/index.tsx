import { createFileRoute } from '@tanstack/react-router'
import SignInPage from '@/pages/sign-in/SignInPage'

export const Route = createFileRoute('/_auth/login/')({
  component: RouteComponent,
  staticData: {
    pageTitle: 'Sign In',
  },
})

function RouteComponent() {
  return <SignInPage />
}
