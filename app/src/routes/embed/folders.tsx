import { createFileRoute } from '@tanstack/react-router'
import { AdaptiveScreen, FoldersScreen } from '@/pages/mobile'
import FoldersPage from '@/pages/folders/FoldersPage'

export const Route = createFileRoute('/embed/folders')({
  component: RouteComponent,
  staticData: {
    pageTitle: 'Folders',
  },
})

function RouteComponent() {
  return (
    <AdaptiveScreen
      mobile={<FoldersScreen />}
      web={<FoldersPage />}
    />
  )
}
