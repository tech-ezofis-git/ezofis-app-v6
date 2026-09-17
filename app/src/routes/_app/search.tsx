import { createFileRoute } from '@tanstack/react-router'
import SearchPage from '@/pages/search/SearchPage'

export const Route = createFileRoute('/_app/search')({
  component: RouteComponent,
  staticData: { pageTitle: 'Search' },
  validateSearch: (search: Record<string, unknown>): { q?: string } => ({
    q: typeof search.q === 'string' ? search.q : undefined,
  }),
})

function RouteComponent() {
  return <SearchPage />
}
