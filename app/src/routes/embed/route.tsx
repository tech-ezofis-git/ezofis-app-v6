import { createFileRoute, Outlet } from '@tanstack/react-router'
import EmbedLayout from '@/layouts/embed/EmbedLayout'

export const Route = createFileRoute('/embed')({
  component: EmbedRouteComponent,
  staticData: {
    pageTitle: 'Embed Layout',
  },
  beforeLoad: () => {
    // Future backend session validation / token exchange logic will be plugged in here.
    // For now: No login redirects, no session checks, simply allow direct rendering.
  },
})

function EmbedRouteComponent() {
  return (
    <EmbedLayout>
      <Outlet />
    </EmbedLayout>
  )
}
