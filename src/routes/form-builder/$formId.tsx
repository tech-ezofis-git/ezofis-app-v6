import { createFileRoute } from '@tanstack/react-router'
import FormBuilderPage from '@/pages/form-builder/FormBuilderPage'

export const Route = createFileRoute('/form-builder/$formId')({
  component: RouteComponent,
  staticData: {
    pageTitle: 'Form Builder',
  },
})

function RouteComponent() {
  return <FormBuilderPage />
}
