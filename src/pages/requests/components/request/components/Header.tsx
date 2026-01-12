import React from 'react'
// import CloseButton from '@/components/base/button/CloseButton'
import IconButton from '@/components/base/button/IconButton'
// import Divider from '@/components/base/Divider'
import OverlayHeaderWrapper from '@/components/base/overlay/OverlayHeaderWrapper'
// import Title from '@/components/base/Title'
import Tooltip from '@/components/base/Tooltip'
// import { 300 } from '@/constants'
// import requestStore from '../../../stores/useRequestStore' // Adjust path if needed

interface HeaderProps {
  requestNo: string
  isLoading: boolean
  stage?: any
  raisedBy?: any
  raisedAt: any
  onNext?: () => void
  onPrev?: () => void
}

const Header: React.FC<HeaderProps> = ({
  requestNo,
  isLoading,
  onNext,
  onPrev
}) => {
  // Store UI state
  // const isMaximized = requestStore((state) => state.isMaximized)
  // const closeRequest = requestStore((state) => state.closeRequest)
  // const toggleMaximize = requestStore((state) => state.toggleMaximize)

  return (
    <OverlayHeaderWrapper className='justify-between gap-4 '>
      <div className='flex items-center gap-1 p-0  bg-white'>
        {/* Dynamic Request Number */}
        <div className='text-15/9 font-semibold text-gray-13'>
          {isLoading ? (
            <span className="animate-pulse bg-gray-200 rounded px-2 text-transparent">REQ-Loading</span>
          ) : (
            requestNo || 'REQ - ...'
          )}
        </div>

        {/* <Divider className='my-auto mr-2 ml-4 h-5' orientation='vertical' /> */}

        {/* Navigation Buttons */}

      </div>

      <div className='flex items-center gap-1'>
        {/* <Tooltip
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
          
        </Tooltip> */}
        <Tooltip content='Previous' openDelay={300} >
          <IconButton
            color='gray'
            icon='tabler:chevron-left'
            variant='ghost'
            disabled={!onPrev || isLoading}
            onClick={onPrev}
            className="cursor-pointer"
          />
        </Tooltip>
        <Tooltip content='Next' openDelay={500}>
          <IconButton
            color='gray'
            icon='lucide:chevron-right'
            variant='ghost'
            disabled={!onNext || isLoading}
            onClick={onNext}
          />
        </Tooltip>
        {/* <CloseButton onClick={closeRequest} /> */}
      </div>
    </OverlayHeaderWrapper >
  )
}

Header.displayName = 'Header'
export default Header