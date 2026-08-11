import { createFileRoute } from '@tanstack/react-router'
import FormEntriesPage from '@/pages/forms/FormEntriesPage'

export const Route = createFileRoute('/_app/forms_/$formId/entries')({
  component: RouteComponent,
  staticData: {
    pageTitle: 'Form Entries',
  },
})

function RouteComponent() {
  return <FormEntriesPage />
}
