import { createFileRoute } from '@tanstack/react-router'
import MyAccountPage from '@/pages/my-account/MyAccountPage'

export const Route = createFileRoute('/_app/my-account/{-$slug}')({
  component: RouteComponent,
  staticData: {
    pageTitle: 'My Account',
  },
})

function RouteComponent() {
  return <MyAccountPage />
}
