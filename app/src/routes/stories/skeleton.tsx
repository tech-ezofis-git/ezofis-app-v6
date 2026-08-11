import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/stories/skeleton')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/stories/skeleton"!</div>
}
