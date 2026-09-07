import { createFileRoute } from '@tanstack/react-router'
import FormEntriesPage from '@/pages/forms/FormEntriesPage'

type FormEntriesDeepLinkSearch = {
  entryId?: string
}

export const Route = createFileRoute('/_app/forms_/$formId/entries')({
  component: RouteComponent,
  staticData: {
    pageTitle: 'Form Entries',
  },
  validateSearch: (
    search: Record<string, unknown>,
  ): FormEntriesDeepLinkSearch => ({
    entryId: typeof search.entryId === 'string' ? search.entryId : undefined,
  }),
})

function RouteComponent() {
  return <FormEntriesPage />
}
