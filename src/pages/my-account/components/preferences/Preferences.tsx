import Divider from '@/components/base/Divider'
import Title from '@/components/base/Title'
import ChangeLanguage from './components/ChangeLanguage'
import ChangeTheme from './components/ChangeTheme'

const Preferences = () => {
  return (
    <div className='mx-auto max-w-4xl p-8'>
      <Title level={1} title='Preferences' />
      <Divider className='my-6' />
      <ChangeTheme />
      <Divider className='my-6' />
      <ChangeLanguage />
    </div>
  )
}

Preferences.displayName = 'Preferences'
export default Preferences
