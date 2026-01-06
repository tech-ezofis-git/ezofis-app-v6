import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import Tab from '@/components/base/tabs/Tab'
import Tabs from '@/components/base/tabs/Tabs'
import useFieldListStore from '../../stores/useFieldListStore'

interface Props {
  tab: string | null
  setTab: (value: string | null) => void
}

const Header = ({ tab, setTab }: Props) => {
  const toggleFieldList = useFieldListStore((state) => state.toggleFieldList)

  return (
    <header className='flex h-13 flex-wrap items-center border-b border-gray-3 pr-6 pl-4'>
      <div className='flex flex-1 items-center'>
        <IconButton
          color='gray'
          icon='tabler:menu-3'
          variant='ghost'
          onClick={toggleFieldList}
        />
        <Button
          className='-ml-1 text-15 font-semibold text-gray-13'
          color='gray'
          label='New Form'
          variant='ghost'
        />
      </div>

      <div className='flex flex-1 justify-center'>
        <Tabs color='primary' value={tab} onChange={setTab}>
          <Tab label='Build' value='Build' />
          <Tab label='Publish' value='Publish' />
          <Tab label='Settings' value='Settings' />
        </Tabs>
      </div>

      <div className='flex flex-1 items-center justify-end gap-2'>
        <Button
          color='gray'
          icon='lucide:eye'
          label='Preview'
          variant='outline'
        />
        <Button icon='lucide:save' label='Save' />
      </div>
    </header>
  )
}

Header.displayName = 'Header'
export default Header
