import authUserStore from '@/stores/authUserStore'
import type { TableUser } from './tableColumnDefaults'

/** Current session user, in the shape the table column defaults expect. */
export const getSessionTableUser = (): TableUser => {
  const session = authUserStore.getState().session
  const fullName =
    `${session?.firstName || ''} ${session?.lastName || ''}`.trim()
  return {
    email: session?.email || '',
    firstName: session?.firstName || '',
    name: fullName,
  }
}
