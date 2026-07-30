import { useNavigate } from '@tanstack/react-router'
import Menu from '@/components/base/menu/Menu'
import MenuDivider from '@/components/base/menu/MenuDivider'
import MenuItem from '@/components/base/menu/MenuItem'
import authUserStore from '@/stores/authUserStore'
import Language from './components/Language'
import Theme from './components/Theme'
import User from './components/User'
import UserMenuTrigger from './components/UserMenuTrigger'

const UserMenu = () => {
  const navigate = useNavigate()
  const resetAuthState = authUserStore((state) => state.resetAuthState)

  const goto = (slug: string) => {
    navigate({ params: { slug }, to: '/my-account/{-$slug}' })
  }

  const logout = () => {
    resetAuthState()
    // Hard redirect avoids SPA guard bounce (/sign-in → / → /sign-in) and feels instant
    globalThis.location.replace('/sign-in')
  }

  return (
    <Menu position='bottom-end' target={<UserMenuTrigger />} width={224}>
      <User />
      <MenuDivider />
      <MenuItem
        icon='lucide:user'
        label='Profile'
        onClick={() => goto('profile')}
      />
      <MenuItem
        icon='lucide:shield'
        label='Security'
        onClick={() => goto('security')}
      />
      <MenuItem
        icon='lucide:settings-2'
        label='Preferences'
        onClick={() => goto('preferences')}
      />
      <MenuDivider />
      <Theme />
      <Language />
      <MenuDivider />
      <MenuItem
        icon='lucide:log-out'
        iconClass='text-red-11'
        label='Log out'
        onClick={logout}
      />
    </Menu>
  )
}

UserMenu.displayName = 'UserMenu'
export default UserMenu
