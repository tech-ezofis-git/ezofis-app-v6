import { createFileRoute } from '@tanstack/react-router'
import PlayGroundPage from '@/pages/playground/PlaygroundPage'

export const Route = createFileRoute('/playground')({
  component: RouteComponent,
  staticData: {
    pageTitle: 'Playground',
  },
})

function RouteComponent() {
  return <PlayGroundPage />
}
