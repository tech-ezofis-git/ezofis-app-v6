import { resolveShareContext } from '@/pages/folders/utils/shareContextStorage'
import authUserStore from '@/stores/authUserStore'

/**
 * True while the user is in a shared-link session (opened a file someone
 * shared or sent to sign). The app then shows only that file: no sidebar,
 * no top-bar tools, no Back / AI Summary, and a user menu with just the
 * user and Log out.
 */
const useIsGuestShare = () => {
  const shareContext = authUserStore((state) => state.shareContext)
  return Boolean(resolveShareContext(shareContext)?.shareToken)
}

export default useIsGuestShare
