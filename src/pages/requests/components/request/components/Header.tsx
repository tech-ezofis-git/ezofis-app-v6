import React from 'react'
// import CloseButton from '@/components/base/button/CloseButton'
import IconButton from '@/components/base/button/IconButton'
// import Divider from '@/components/base/Divider'
import OverlayHeaderWrapper from '@/components/base/overlay/OverlayHeaderWrapper'
// import Title from '@/components/base/Title'
import Tooltip from '@/components/base/Tooltip'
import Button from '@/components/base/button/Button'
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
  onBack?: () => void
  onApprove?: () => void
  approveLoading?: boolean
}

const Header: React.FC<HeaderProps> = ({
  requestNo,
  isLoading,
  onNext,
  onPrev,
  onBack,
  onApprove,
  approveLoading
}) => {
  // Store UI state
  // const isMaximized = requestStore((state) => state.isMaximized)
  // const closeRequest = requestStore((state) => state.closeRequest)
  // const toggleMaximize = requestStore((state) => state.toggleMaximize)

  return (
    <OverlayHeaderWrapper className='justify-between gap-4'>

      {/* Left Side Group: Request Number + Navigation Buttons */}
      <div className='flex items-center gap-3 bg-white p-0'>
        <IconButton
          color='gray'
          icon='tabler:arrow-left'
          variant='ghost'
          // disabled={!onPrev || isLoading}
          onClick={onBack}
          className="cursor-pointer"
          size="sm" // Optional: makes buttons slightly smaller if needed
        />
        {/* Dynamic Request Number */}
        <div className='text-15/9 font-semibold text-gray-13'>

          {isLoading ? (
            <span className="animate-pulse rounded bg-gray-200 px-2 text-transparent">REQ-Loading</span>
          ) : (
            requestNo || 'REQ - ...'
          )}
        </div>

        {/* Navigation Buttons - Placed right next to REQ */}
        <div className='flex items-center border-l border-gray-3 pl-2'>
          <Tooltip content='Previous' openDelay={300}>
            <IconButton
              color='gray'
              icon='tabler:chevron-left'
              variant='ghost'
              disabled={!onPrev || isLoading}
              onClick={onPrev}
              className="cursor-pointer"
              size="sm" // Optional: makes buttons slightly smaller if needed
            />
          </Tooltip>
          <Tooltip content='Next' openDelay={500}>
            <IconButton
              color='gray'
              icon='lucide:chevron-right'
              variant='ghost'
              disabled={!onNext || isLoading}
              onClick={onNext}
              size="sm"
            />
          </Tooltip>
        </div>

      </div>

      {/* Right Side Group: (Maximize / Close - currently commented out) */}
      <div className='flex items-center gap-1 pb-2'>
        {/* <Tooltip
          content={isMaximized ? 'Minimize' : 'Maximize'}
          openDelay={500}
        >
          <IconButton
            color='gray'
            icon={isMaximized ? 'lucide:minimize' : 'lucide:maximize'}
            variant='ghost'
            onClick={toggleMaximize}
          />
        </Tooltip> */}

        {/* <CloseButton onClick={closeRequest} /> */}

        {<Button onClick={onApprove} loading={approveLoading} className='cursor-pointer'> Approve</Button>}
      </div>
    </OverlayHeaderWrapper >
  )
}

Header.displayName = 'Header'
export default Header