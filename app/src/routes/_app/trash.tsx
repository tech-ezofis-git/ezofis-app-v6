import { createFileRoute } from '@tanstack/react-router'
import TrashPage from '@/pages/trash/TrashPage'

export const Route = createFileRoute('/_app/trash')({
  component: RouteComponent,
  staticData: {
    pageTitle: 'Trash',
  },
})

function RouteComponent() {
  return <TrashPage />
}
