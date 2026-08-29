import { createFileRoute } from '@tanstack/react-router'
import PortalPage from '@/pages/portal/PortalPage'

export const Route = createFileRoute('/portals_/$portalId')({
  component: RouteComponent,
  staticData: {
    pageTitle: 'Portal',
  },
})

function RouteComponent() {
  const { portalId } = Route.useParams()
  return <PortalPage portalId={portalId} />
}
