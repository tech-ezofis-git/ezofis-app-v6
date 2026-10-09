import { createFileRoute } from '@tanstack/react-router'
import SignRequestInvitePage from '@/pages/sign-request/SignRequestInvitePage'

type SignRequestSearch = {
  auth?: string
  email?: string
  isnew?: string | boolean
}

export const Route = createFileRoute('/sign-request/$')({
  component: RouteComponent,
  staticData: {
    pageTitle: 'Sign Request',
  },
  validateSearch: (search: Record<string, unknown>): SignRequestSearch => ({
    auth: typeof search.auth === 'string' ? search.auth : undefined,
    email: typeof search.email === 'string' ? search.email : undefined,
    isnew:
      typeof search.isnew === 'string' || typeof search.isnew === 'boolean'
        ? search.isnew
        : undefined,
  }),
})

function RouteComponent() {
  const { _splat } = Route.useParams()
  const search = Route.useSearch()
  const email = String(search.email || '')
  const auth = typeof search.auth === 'string' ? search.auth : undefined
  const isNew =
    search.isnew === true || String(search.isnew || '').toLowerCase() === 'true'

  return (
    <SignRequestInvitePage
      auth={auth}
      email={email}
      invitePath={String(_splat || '')}
      isNew={isNew}
    />
  )
}
