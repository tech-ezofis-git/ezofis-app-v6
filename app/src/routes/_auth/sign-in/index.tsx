import { createFileRoute } from '@tanstack/react-router'
import { AdaptiveScreen, LoginScreen } from '@/pages/mobile'
import SignInPage from '@/pages/sign-in/SignInPage'

export const Route = createFileRoute('/_auth/sign-in/')({
  component: RouteComponent,
  staticData: {
    pageTitle: 'Sign In',
  },
})

function RouteComponent() {
  return <AdaptiveScreen mobile={<LoginScreen />} web={<SignInPage />} />
}
