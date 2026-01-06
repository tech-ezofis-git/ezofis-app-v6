import GeneralSettings from './components/GeneralSettings'

const Settings = () => {
  return (
    <div className='flex'>
      <div className='hidden'></div>
      <div className='flex-1'>
        <GeneralSettings />
      </div>
    </div>
  )
}

Settings.displayName = 'Settings'
export default Settings
