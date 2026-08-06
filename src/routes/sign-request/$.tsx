import { createFileRoute } from '@tanstack/react-router'
import SignRequestInvitePage from '@/pages/sign-request/SignRequestInvitePage'

type SignRequestSearch = {
  email?: string
  isnew?: string | boolean
}

export const Route = createFileRoute('/sign-request/$')({
  validateSearch: (search: Record<string, unknown>): SignRequestSearch => ({
    email: typeof search.email === 'string' ? search.email : undefined,
    isnew:
      typeof search.isnew === 'string' || typeof search.isnew === 'boolean'
        ? search.isnew
        : undefined,
  }),
  component: RouteComponent,
  staticData: {
    pageTitle: 'Sign Request',
  },
})

function RouteComponent() {
  const { _splat } = Route.useParams()
  const search = Route.useSearch()
  const email = String(search.email || '')
  const isNew =
    search.isnew === true ||
    String(search.isnew || '').toLowerCase() === 'true'

  return (
    <SignRequestInvitePage
      email={email}
      invitePath={String(_splat || '')}
      isNew={isNew}
    />
  )
}
