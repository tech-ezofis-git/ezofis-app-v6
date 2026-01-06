import { useParams } from '@tanstack/react-router'
import { useNavigate } from '@tanstack/react-router'
import Tab from '@/components/base/tabs/Tab'
import Tabs from '@/components/base/tabs/Tabs'
import Preferences from './components/preferences/Preferences'
import Profile from './components/profile/Profile'
import Security from './components/security/Security'

const MyAccountPage = () => {
  const { slug } = useParams({ strict: false })

  const navigate = useNavigate()

  const goto = (slug: string | null) => {
    navigate({
      params: { slug: slug || 'profile' },
      to: '/my-account/{-$slug}',
    })
  }

  return (
    <>
      <div className='border-b border-gray-3 px-6'>
        <Tabs color='primary' value={slug || 'profile'} onChange={goto}>
          <Tab label='Profile' value='profile' />
          <Tab label='Security' value='security' />
          <Tab label='Preferences' value='preferences' />
        </Tabs>
      </div>

      {slug === 'profile' && <Profile />}
      {slug === 'security' && <Security />}
      {slug === 'preferences' && <Preferences />}
    </>
  )
}

MyAccountPage.displayName = 'MyAccountPage'
export default MyAccountPage
