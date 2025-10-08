import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import Indicator from '@/components/base/Indicator'

const Notifications = () => {
  return (
    <Button className='w-full gap-3 px-2' color='gray' variant='ghost'>
      <Indicator animate>
        <Icon name='tabler:bell' />
      </Indicator>

      <span>Notifications</span>
    </Button>
  )
}

export default Notifications
