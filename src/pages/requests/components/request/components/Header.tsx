import React from 'react'
// import CloseButton from '@/components/base/button/CloseButton'
import IconButton from '@/components/base/button/IconButton'
// import Indicator from '@/components/base/Indicator'
// import Divider from '@/components/base/Divider'
import OverlayHeaderWrapper from '@/components/base/overlay/OverlayHeaderWrapper'
// import Title from '@/components/base/Title'
import Tooltip from '@/components/base/Tooltip'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
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
  rightView: 'analysis' | 'comments' | 'attachments'
  setRightView: (view: 'analysis' | 'comments' | 'attachments') => void
  hideActions?: boolean
  showApprove?: boolean
  attachmentCount?: number
  commentsCount?: number
}

const Header: React.FC<HeaderProps> = ({
  requestNo,
  isLoading,
  onNext,
  onPrev,
  onBack,
  onApprove,
  approveLoading,
  rightView,
  setRightView,
  hideActions,
  showApprove = true,
  attachmentCount = 0,
  commentsCount = 0
}) => {
  // Store UI state
  // const isMaximized = requestStore((state) => state.isMaximized)
  // const closeRequest = requestStore((state) => state.closeRequest)
  // const toggleMaximize = requestStore((state) => state.toggleMaximize)

  return (
    <OverlayHeaderWrapper className='justify-between gap-4'>

      {/* Left Side Group: Request Number + Navigation Buttons */}
      <div className='flex items-center gap-2 bg-white p-0 '>
        <IconButton
          color='gray'
          icon='tabler:arrow-left'
          variant='ghost'
          onClick={onBack}
          className="cursor-pointer"
          size="sm"
        />

        {/* Navigation & Title Group */}
        <div className="flex items-center gap-0.5">
          <Tooltip content='Previous' openDelay={300}>
            <IconButton
              color='gray'
              icon='tabler:chevron-left'
              variant='ghost'
              disabled={!onPrev || isLoading}
              onClick={onPrev}
              className="cursor-pointer"
              size="sm"
            />
          </Tooltip>

          {/* Dynamic Request Number */}
          <div className='text-15/9 font-semibold text-gray-13 px-1 text-center min-w-[80px]'>
            {isLoading ? (
              <span className="animate-pulse rounded bg-gray-200 px-2 text-transparent">REQ-Loading</span>
            ) : (
              requestNo || 'REQ - ...'
            )}
          </div>

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

      {/* Right Side Group: Comments/Attachments + Approve */}
      <div className='flex items-center pt-2 gap-3 mb-2'>

        {/* Comments & Attachments Toggles */}
        <div className="flex items-center gap-2">
          <Tooltip content="Comments">
            <button
              onClick={() => setRightView(rightView === 'comments' ? 'analysis' : 'comments')}
              className={`relative flex cursor-pointer items-center justify-center size-9 rounded-full transition-all border overflow-visible ${rightView === 'comments'
                ? 'bg-[var(--blue-1)] text-[var(--blue-9)] border-[var(--blue-3)] shadow-sm'
                : 'bg-transparent text-[var(--gray-10)] border-transparent hover:bg-[var(--gray-2)] hover:text-[var(--gray-12)]'
                }`}
            >
              <Icon name="tabler:message-circle" className="size-5" />
              {commentsCount > 0 && (
                <div className="absolute -top-1 -right-1 z-50 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--red-9)] px-1 text-[10px] font-bold text-white ring-2 ring-white">
                  {commentsCount}
                </div>
              )}
            </button>
          </Tooltip>

          <Tooltip content="Attachments" >
            <button
              onClick={() => setRightView(rightView === 'attachments' ? 'analysis' : 'attachments')}
              className={`relative flex cursor-pointer items-center justify-center size-9 rounded-full transition-all border overflow-visible ${rightView === 'attachments'
                ? 'bg-[var(--blue-1)] text-[var(--blue-9)] border-[var(--blue-3)] shadow-sm'
                : 'bg-transparent text-[var(--gray-10)] border-transparent hover:bg-[var(--gray-2)] hover:text-[var(--gray-12)]'
                }`}
            >
              <Icon name="tabler:paperclip" className="size-5 !cursor-pointer" />
              {attachmentCount > 0 && (
                <div className="absolute -top-1 -right-1 z-50 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--red-9)] px-1 text-[10px] font-bold text-white ring-2 ring-white">
                  {attachmentCount}
                </div>
              )}
            </button>
          </Tooltip>
        </div>

        {/* Divider */}
        {!hideActions && showApprove && <div className="h-6 w-px bg-[var(--gray-3)] mx-1" />}

        {!hideActions && showApprove && (
          <Button onClick={onApprove} loading={approveLoading} className='cursor-pointer'>
            <Icon name="tabler:circle-dashed-check" className="size-5" />
            <span>Approve</span>
          </Button>
        )}
      </div>
    </OverlayHeaderWrapper >
  )
}

Header.displayName = 'Header'
export default Header