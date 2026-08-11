import { createFileRoute } from '@tanstack/react-router'
import FormsPage from '@/pages/forms/FormsPage'

export const Route = createFileRoute('/_app/forms')({
  component: RouteComponent,
  staticData: {
    pageTitle: 'Forms',
  },
})

function RouteComponent() {
  return <FormsPage />
}
