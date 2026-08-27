import { useLingui } from '@lingui/react/macro'
import { useParams } from '@tanstack/react-router'
import { useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import Tab from '@/components/base/tabs/Tab'
import Tabs from '@/components/base/tabs/Tabs'
import Preferences from './components/preferences/Preferences'
import Profile from './components/profile/Profile'
import Security from './components/security/Security'

const MyAccountPage = () => {
  const { t } = useLingui()
  const { slug } = useParams({ strict: false })
  const navigate = useNavigate()

  const goto = (nextSlug: string | null) => {
    navigate({
      params: { slug: nextSlug || 'profile' },
      to: '/my-account/{-$slug}',
    })
  }

  useEffect(() => {
    if (slug !== 'branding') return
    navigate({
      params: { slug: 'profile' },
      replace: true,
      to: '/my-account/{-$slug}',
    })
  }, [navigate, slug])

  return (
    <div className='flex h-full min-h-0 flex-1 flex-col overflow-hidden'>
      <div className='shrink-0 border-b border-gray-3 px-6'>
        <Tabs color='primary' value={slug || 'profile'} onChange={goto}>
          <Tab label={t`Profile`} value='profile' />
          <Tab label={t`Security`} value='security' />
          <Tab label={t`Preferences`} value='preferences' />
        </Tabs>
      </div>

      <div className='min-h-0 flex-1 overflow-y-auto'>
        {slug === 'profile' && <Profile />}
        {slug === 'security' && <Security />}
        {slug === 'preferences' && <Preferences />}
      </div>
    </div>
  )
}

MyAccountPage.displayName = 'MyAccountPage'
export default MyAccountPage
