import CloseButton from '@/components/base/button/CloseButton'
import IconButton from '@/components/base/button/IconButton'
import Divider from '@/components/base/Divider'
import OverlayHeaderWrapper from '@/components/base/overlay/OverlayHeaderWrapper'
import Title from '@/components/base/Title'
import Tooltip from '@/components/base/Tooltip'
import requestStore from '@/pages/requests/stores/useRequestStore'

const Header = () => {
  const isMaximized = requestStore((state) => state.isMaximized)
  const closeRequest = requestStore((state) => state.closeRequest)
  const toggleMaximize = requestStore((state) => state.toggleMaximize)

  return (
    <OverlayHeaderWrapper className='justify-between gap-4 px-4'>
      <div className='flex items-center gap-1'>
        <Title level={3} title='REQ - 5649' />

        <Divider className='my-auto mr-2 ml-4 h-5' orientation='vertical' />

        <Tooltip content='Previous' openDelay={500}>
          <IconButton color='gray' icon='lucide:chevron-left' variant='ghost' />
        </Tooltip>
        <Tooltip content='Next' openDelay={500}>
          <IconButton
            color='gray'
            icon='lucide:chevron-right'
            variant='ghost'
          />
        </Tooltip>
      </div>

      <div className='flex items-center gap-1'>
        <Tooltip
          content={isMaximized ? 'Minimize' : 'Maximize'}
          openDelay={500}
        >
          <IconButton
            color='gray'
            icon={isMaximized ? 'lucide:minimize' : 'lucide:maximize'}
            variant='ghost'
            onClick={toggleMaximize}
          />
        </Tooltip>
        <CloseButton onClick={closeRequest} />
      </div>
    </OverlayHeaderWrapper>
  )
}

Header.displayName = 'Header'
export default Header
