import CloseButton from '@/components/base/button/CloseButton'
import IconButton from '@/components/base/button/IconButton'
import Divider from '@/components/base/Divider'
import OverlayHeaderWrapper from '@/components/base/overlay/OverlayHeaderWrapper'
import Tooltip from '@/components/base/Tooltip'
import { TOOLTIP_DELAY } from '@/constants'
import requestStore from '@/pages/requests/stores/useRequestStore'

const Header = () => {
  const isMaximized = requestStore((state) => state.isMaximized)
  const closeRequest = requestStore((state) => state.closeRequest)
  const toggleMaximize = requestStore((state) => state.toggleMaximize)

  return (
    <OverlayHeaderWrapper className='justify-between gap-4 px-6'>
      <div className='flex items-center gap-1'>
        <div className='text-medium/9 font-semibold text-gray-13'>
          REQ - 5649
        </div>

        <Divider className='my-auto mr-2 ml-4 h-5' orientation='vertical' />

        <Tooltip content='Previous' openDelay={TOOLTIP_DELAY}>
          <IconButton color='gray' icon='tabler:chevron-left' variant='ghost' />
        </Tooltip>
        <Tooltip content='Next' openDelay={TOOLTIP_DELAY}>
          <IconButton
            color='gray'
            icon='tabler:chevron-right'
            variant='ghost'
          />
        </Tooltip>
      </div>

      <div className='flex items-center gap-1'>
        <Tooltip
          content={isMaximized ? 'Minimize' : 'Maximize'}
          openDelay={TOOLTIP_DELAY}
        >
          <IconButton
            color='gray'
            variant='ghost'
            icon={
              isMaximized
                ? 'tabler:arrows-diagonal-minimize-2'
                : 'tabler:arrows-diagonal'
            }
            onClick={toggleMaximize}
          />
        </Tooltip>
        <Divider className='mx-2 my-auto h-5' orientation='vertical' />
        <CloseButton onClick={closeRequest} />
      </div>
    </OverlayHeaderWrapper>
  )
}

Header.displayName = 'Header'
export default Header
