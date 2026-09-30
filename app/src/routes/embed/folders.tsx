import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import FoldersPage from '@/pages/folders/FoldersPage'
import { AdaptiveScreen, FoldersScreen } from '@/pages/mobile'
import authUserStore from '@/stores/authUserStore'

export const Route = createFileRoute('/embed/folders')({
  component: RouteComponent,
  staticData: {
    pageTitle: 'Folders',
  },
  validateSearch: (search: Record<string, unknown>) => ({
    email: typeof search.email === 'string' ? search.email : undefined,
    folderId: typeof search.folderId === 'string' ? search.folderId : undefined,
    itemId: typeof search.itemId === 'string' ? search.itemId : undefined,
    repositoryId:
      typeof search.repositoryId === 'string' ? search.repositoryId : undefined,
    view: typeof search.view === 'string' ? search.view : undefined,
  }),
})

function RouteComponent() {
  const search = Route.useSearch()

  useEffect(() => {
    const email = search?.email
    if (email) {
      const state = authUserStore.getState()
      if (!state.session || state.session.email !== email) {
        const userName = email.split('@')[0] || 'User'
        state.setSession({
          email,
          firstName: userName,
          id: 'embed-' + email,
          lastName: '',
          role: 'Admin',
        } as any)
        if (!state.identity) {
          state.setIdentity({
            accessToken: 'embed-token-' + email,
          } as any)
        }
      }
    }
  }, [search])

  return <AdaptiveScreen mobile={<FoldersScreen />} web={<FoldersPage />} />
}
