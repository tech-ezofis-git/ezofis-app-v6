import { createFileRoute } from '@tanstack/react-router'
import InvalidUrlPage from '@/pages/on-boarding/InvalidUrlPage'

export const Route = createFileRoute('/on-boarding/')({
  component: RouteComponent,
  staticData: {
    pageTitle: 'On Boarding',
  },
})

function RouteComponent() {
  return <InvalidUrlPage />
}
