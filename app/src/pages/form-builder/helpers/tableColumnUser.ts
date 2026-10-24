import { getCurrentFormUser } from '@/utils/currentFormUser'
import type { TableUser } from './tableColumnDefaults'

/** Current session user, in the shape the table column defaults expect. */
export const getSessionTableUser = (): TableUser => {
  const session = getCurrentFormUser()
  const fullName = `${session.firstName} ${session.lastName}`.trim()
  return {
    email: session.email,
    firstName: session.firstName,
    name: fullName,
  }
}
