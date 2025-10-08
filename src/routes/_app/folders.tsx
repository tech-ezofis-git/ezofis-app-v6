import { createFileRoute } from '@tanstack/react-router'
import FoldersPage from '@/pages/folders/FoldersPage'

export const Route = createFileRoute('/_app/folders')({
  component: RouteComponent,
})

function RouteComponent() {
  return <FoldersPage />
}
