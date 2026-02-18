import GeneralSettings from './components/GeneralSettings'

interface SettingsProps {
  setTab: (value: string | null) => void
}

const Settings = ({ setTab }: SettingsProps) => {
  return (
    <div className='flex'>
      <div className='hidden'></div>
      <div className='flex-1'>
        <GeneralSettings setTab={setTab} />
      </div>
    </div>
  )
}

Settings.displayName = 'Settings'
export default Settings
