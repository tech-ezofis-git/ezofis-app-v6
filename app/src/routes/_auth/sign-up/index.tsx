import { createFileRoute } from '@tanstack/react-router'
import { AdaptiveScreen, MobileSignUpFlow } from '@/pages/mobile'
import SignUpPage from '@/pages/sign-up/SignUpPage'

export const Route = createFileRoute('/_auth/sign-up/')({
  component: RouteComponent,
  staticData: {
    pageTitle: 'Sign Up',
  },
})

function RouteComponent() {
  return <AdaptiveScreen mobile={<MobileSignUpFlow />} web={<SignUpPage />} />
}
