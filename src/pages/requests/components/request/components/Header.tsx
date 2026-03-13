import React from 'react'
import Button from '@/components/base/button/Button'
// import CloseButton from '@/components/base/button/CloseButton'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
// import Indicator from '@/components/base/Indicator'
// import Divider from '@/components/base/Divider'
import OverlayHeaderWrapper from '@/components/base/overlay/OverlayHeaderWrapper'
// import Title from '@/components/base/Title'
import Tooltip from '@/components/base/Tooltip'
// import { 300 } from '@/constants'
// import requestStore from '../../../stores/useRequestStore' // Adjust path if needed

interface HeaderProps {
  isLoading: boolean
  raisedAt: any
  requestNo: string
  rightView: 'analysis' | 'comments' | 'attachments'
  approveLoading?: boolean
  attachmentCount?: number
  commentsCount?: number
  hideActions?: boolean
  raisedBy?: any
  showApprove?: boolean
  stage?: any
  setRightView: (view: 'analysis' | 'comments' | 'attachments') => void
  onApprove?: () => void
  onBack?: () => void
  onNext?: () => void
  onPrev?: () => void
}

const Header: React.FC<HeaderProps> = ({
  approveLoading,
  attachmentCount = 0,
  commentsCount = 0,
  hideActions,
  isLoading,
  requestNo,
  rightView,
  showApprove = true,
  setRightView,
  onApprove,
  onBack,
  onNext,
  onPrev,
}) => {
  // Store UI state
  // const isMaximized = requestStore((state) => state.isMaximized)
  // const closeRequest = requestStore((state) => state.closeRequest)
  // const toggleMaximize = requestStore((state) => state.toggleMaximize)

  return (
    <OverlayHeaderWrapper className='justify-between gap-4'>
      {/* Left Side Group: Request Number + Navigation Buttons */}
      <div className='flex items-center gap-2 bg-white p-0'>
        <IconButton
          className='cursor-pointer'
          color='gray'
          icon='tabler:arrow-left'
          size='sm'
          variant='ghost'
          onClick={onBack}
        />

        {/* Navigation & Title Group */}
        <div className='flex items-center gap-0.5'>
          <Tooltip content='Previous' openDelay={300}>
            <IconButton
              className='cursor-pointer'
              color='gray'
              disabled={!onPrev || isLoading}
              icon='tabler:chevron-left'
              size='sm'
              variant='ghost'
              onClick={onPrev}
            />
          </Tooltip>

          {/* Dynamic Request Number */}
          <div className='min-w-[80px] px-1 text-center text-15/9 font-semibold text-gray-13'>
            {isLoading ? (
              <span className='bg-gray-200 animate-pulse rounded px-2 text-transparent'>
                REQ-Loading
              </span>
            ) : (
              requestNo || 'REQ - ...'
            )}
          </div>

          <Tooltip content='Next' openDelay={500}>
            <IconButton
              color='gray'
              disabled={!onNext || isLoading}
              icon='lucide:chevron-right'
              size='sm'
              variant='ghost'
              onClick={onNext}
            />
          </Tooltip>
        </div>
      </div>

      {/* Right Side Group: Comments/Attachments + Approve */}
      <div className='mb-2 flex items-center gap-3 pt-2'>
        {/* Comments & Attachments Toggles */}
        <div className='flex items-center gap-2'>
          <Tooltip content='Comments'>
            <button
              className={`relative flex size-9 cursor-pointer items-center justify-center overflow-visible rounded-full border transition-all ${
                rightView === 'comments'
                  ? 'border-[var(--blue-3)] bg-[var(--blue-1)] text-[var(--blue-9)] shadow-sm'
                  : 'border-transparent bg-transparent text-[var(--gray-10)] hover:bg-[var(--gray-2)] hover:text-[var(--gray-12)]'
              }`}
              onClick={() =>
                setRightView(rightView === 'comments' ? 'analysis' : 'comments')
              }
            >
              <Icon className='size-5' name='tabler:message-circle' />
              {commentsCount > 0 && (
                <div className='absolute -top-1 -right-1 z-50 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--red-9)] px-1 text-[10px] font-bold text-white ring-2 ring-white'>
                  {commentsCount}
                </div>
              )}
            </button>
          </Tooltip>

          <Tooltip content='Attachments'>
            <button
              className={`relative flex size-9 cursor-pointer items-center justify-center overflow-visible rounded-full border transition-all ${
                rightView === 'attachments'
                  ? 'border-[var(--blue-3)] bg-[var(--blue-1)] text-[var(--blue-9)] shadow-sm'
                  : 'border-transparent bg-transparent text-[var(--gray-10)] hover:bg-[var(--gray-2)] hover:text-[var(--gray-12)]'
              }`}
              onClick={() =>
                setRightView(
                  rightView === 'attachments' ? 'analysis' : 'attachments',
                )
              }
            >
              <Icon
                className='size-5 !cursor-pointer'
                name='tabler:paperclip'
              />
              {attachmentCount > 0 && (
                <div className='absolute -top-1 -right-1 z-50 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--red-9)] px-1 text-[10px] font-bold text-white ring-2 ring-white'>
                  {attachmentCount}
                </div>
              )}
            </button>
          </Tooltip>
        </div>

        {/* Divider */}
        {!hideActions && showApprove && (
          <div className='mx-1 h-6 w-px bg-[var(--gray-3)]' />
        )}

        {!hideActions && showApprove && (
          <Button
            className='cursor-pointer'
            loading={approveLoading}
            onClick={onApprove}
          >
            <Icon className='size-5' name='tabler:circle-dashed-check' />
            <span>Approve</span>
          </Button>
        )}
      </div>
    </OverlayHeaderWrapper>
  )
}

Header.displayName = 'Header'
export default Header
