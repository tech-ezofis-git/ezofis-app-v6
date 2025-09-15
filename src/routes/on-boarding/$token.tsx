import { createFileRoute } from '@tanstack/react-router'
import OnBoardingPage from '@/pages/on-boarding/OnBoardingPage'

export const Route = createFileRoute('/on-boarding/$token')({
  component: RouteComponent,
})

function RouteComponent() {
  return <OnBoardingPage />
}
