import { createFileRoute } from '@tanstack/react-router'
import ClassicPortalPage from '@/pages/portal/ClassicPortalPage'

export const Route = createFileRoute('/portals_/$tenantId/$portalId')({
  component: RouteComponent,
  staticData: {
    pageTitle: 'Portal',
  },
})

function RouteComponent() {
  const { portalId, tenantId } = Route.useParams()
  return (
    <ClassicPortalPage
      key={`${tenantId}/${portalId}`}
      portalId={portalId}
      tenantId={tenantId}
    />
  )
}
