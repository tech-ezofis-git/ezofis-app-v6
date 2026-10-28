import { useLingui } from '@lingui/react/macro'
import { useNavigate } from '@tanstack/react-router'
import Menu from '@/components/base/menu/Menu'
import MenuDivider from '@/components/base/menu/MenuDivider'
import MenuItem from '@/components/base/menu/MenuItem'
import useIsGuestShare from '@/hooks/useIsGuestShare'
import { reloadToSignIn, resolveSignInPath } from '@/lib/branding/session'
import { clearClassicRuntimeCookie } from '@/lib/classic-gateway'
import authUserStore from '@/stores/authUserStore'
import Language from './components/Language'
import Theme from './components/Theme'
import User from './components/User'
import UserMenuTrigger from './components/UserMenuTrigger'

const UserMenu = () => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const resetAuthState = authUserStore((state) => state.resetAuthState)
  // Shared-link sessions: just the user and Log out.
  const isGuestShare = useIsGuestShare()

  const goto = (slug: string) => {
    navigate({ params: { slug }, to: '/my-account/{-$slug}' })
  }

  const logout = () => {
    const signInPath = resolveSignInPath()
    try {
      sessionStorage.clear()
    } catch {
      // ignore
    }
    clearClassicRuntimeCookie()
    // Hard redirect avoids SPA guard bounce and returns to the branded URL when used
    reloadToSignIn(signInPath)
    resetAuthState()
  }

  return (
    <Menu position='bottom-end' target={<UserMenuTrigger />} width={224}>
      <User />
      <MenuDivider />
      {isGuestShare ? null : (
        <>
          <MenuItem
            icon='lucide:user'
            label={t`Profile`}
            onClick={() => goto('profile')}
          />
          <MenuItem
            icon='lucide:shield'
            label={t`Security`}
            onClick={() => goto('security')}
          />
          <MenuItem
            icon='lucide:settings-2'
            label={t`Preferences`}
            onClick={() => goto('preferences')}
          />
          <MenuDivider />
          <Theme />
          <Language />
          <MenuDivider />
        </>
      )}
      <MenuItem
        icon='lucide:log-out'
        iconClass='text-red-11'
        label={t`Log out`}
        onClick={logout}
      />
    </Menu>
  )
}

UserMenu.displayName = 'UserMenu'
export default UserMenu
