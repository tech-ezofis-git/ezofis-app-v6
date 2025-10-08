import { createFileRoute } from '@tanstack/react-router'
import PortalsPage from '@/pages/portals/PortalsPage'

export const Route = createFileRoute('/_app/portals')({
  component: RouteComponent,
})

function RouteComponent() {
  return <PortalsPage />
}
