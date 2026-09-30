import { createFileRoute } from '@tanstack/react-router'
import FoldersPage from '@/pages/folders/FoldersPage'
import { AdaptiveScreen, FoldersScreen } from '@/pages/mobile'

type FoldersDeepLinkSearch = {
  folderId?: string
  itemId?: string
  itemName?: string
  repositoryId?: string
}

export const Route = createFileRoute('/_app/folders')({
  component: RouteComponent,
  staticData: {
    pageTitle: 'Folders',
  },
  validateSearch: (search: Record<string, unknown>): FoldersDeepLinkSearch => ({
    folderId: typeof search.folderId === 'string' ? search.folderId : undefined,
    itemId: typeof search.itemId === 'string' ? search.itemId : undefined,
    itemName: typeof search.itemName === 'string' ? search.itemName : undefined,
    repositoryId:
      typeof search.repositoryId === 'string' ? search.repositoryId : undefined,
  }),
})

function RouteComponent() {
  return <AdaptiveScreen mobile={<FoldersScreen />} web={<FoldersPage />} />
}
