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
import cn from '@/utils/cn';
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
  onApprove?: (action: string) => void
  approveLoading?: boolean
  rightView: 'analysis' | 'comments' | 'attachments' | 'forms'
  setRightView: (view: 'analysis' | 'comments' | 'attachments' | 'forms') => void
  hideActions?: boolean
  showApprove?: boolean
  attachmentCount?: number
  commentsCount?: number
  actions?: any[]
  isEditing?: boolean
  onManualCorrection?: () => void
  supplierName?: string
  totalAmount?: string
  currency?: string
  status?: string
}

const Header: React.FC<HeaderProps> = ({
  requestNo,
  isLoading,
  onNext,
  onPrev,
  onBack,
  onApprove,
  approveLoading,
  hideActions,
  showApprove = true,
  actions,
  isEditing = false,
  onManualCorrection,
  supplierName,
  totalAmount,
  currency,
  status = 'Pending Review'
}) => {
  // Store UI state
  // const isMaximized = requestStore((state) => state.isMaximized)
  // const closeRequest = requestStore((state) => state.closeRequest)
  // const toggleMaximize = requestStore((state) => state.toggleMaximize)

  return (
    <OverlayHeaderWrapper className='justify-between gap-4'>

      {/* Left Side Group: Request Number + Navigation Buttons */}
      <div className='flex items-center gap-4 bg-white p-0 '>
        <IconButton
          color='gray'
          icon='tabler:arrow-left'
          variant='ghost'
          onClick={onBack}
          className="cursor-pointer hover:bg-[var(--gray-2)]"
          size="sm"
        />

        <div className="flex flex-col pb-1">

          <div className="flex items-center gap-3">
            <IconButton
              color='gray'
              icon='tabler:chevron-left'
              variant='ghost'
              disabled={!onPrev || isLoading}
              onClick={onPrev}
              className="cursor-pointer hover:bg-white size-7"
              size="sm"
            />
            <h1 className='text-[15px] font-bold text-[var(--gray-13)] tracking-tight'>
              {isLoading ? (
                <span className="animate-pulse rounded bg-gray-200 px-2 text-transparent">INV-0000-000</span>
              ) : (
                requestNo
              )}
            </h1>
            <IconButton
              color='gray'
              icon='tabler:chevron-right'
              variant='ghost'
              disabled={!onNext || isLoading}
              onClick={onNext}
              className="cursor-pointer hover:bg-white size-7"
              size="sm"
            />
            {/* <div className="flex items-center gap-0.5 bg-[var(--gray-2)] rounded-lg p-0.5 border border-[var(--gray-3)]">
              <IconButton
                color='gray'
                icon='tabler:chevron-left'
                variant='ghost'
                disabled={!onPrev || isLoading}
                onClick={onPrev}
                className="cursor-pointer hover:bg-white size-7"
                size="sm"
              />
              <IconButton
                color='gray'
                icon='tabler:chevron-right'
                variant='ghost'
                disabled={!onNext || isLoading}
                onClick={onNext}
                className="cursor-pointer hover:bg-white size-7"
                size="sm"
              />
            </div> */}
            {!isLoading && (
              <span className="bg-[var(--orange-1)] text-[var(--orange-9)] px-3 py-1 rounded-full text-[11px] font-bold border border-[var(--orange-3)]">
                {status}
              </span>
            )}
          </div>
          {!isLoading && supplierName && (
            <p className="text-[13px] text-[var(--gray-11)] font-medium mt-0.5">{supplierName}</p>
          )}
        </div>
      </div>

      {/* Right Side Group: Total Amount + Actions */}
      <div className='flex items-center gap-8'>
        {totalAmount && (
          <div className="text-right">
            <div className="flex items-baseline justify-end gap-1.5">
              <span className="text-[24px] font-bold text-[var(--gray-13)]">{totalAmount}</span>
              {currency && <span className="text-[12px] font-bold text-[var(--gray-11)] uppercase">{currency}</span>}
            </div>
          </div>
        )}

        {/* Comments & Attachments Toggles */}
        {/* <div className="flex items-center gap-2">
          <Tooltip content="Forms">
            <button
              onClick={() => setRightView(rightView === 'forms' ? 'analysis' : 'forms')}
              className={`relative flex cursor-pointer items-center justify-center size-9 rounded-full transition-all border overflow-visible ${rightView === 'forms'
                ? 'bg-[var(--blue-1)] text-[var(--blue-9)] border-[var(--blue-3)] shadow-sm'
                : 'bg-transparent text-[var(--gray-10)] border-transparent hover:bg-[var(--gray-2)] hover:text-[var(--gray-12)]'
                }`}
            >
              <Icon name="tabler:file-description" className="size-5" />
              
            </button>
          </Tooltip>

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
        </div> */}

        {/* Action Buttons */}
        {!hideActions && (
          <div className="flex items-center gap-2 pb-2">
            <Button
              onClick={onManualCorrection}
              variant="outline"
              className={cn(
                "cursor-pointer bg-white border-[var(--gray-3)] text-[var(--gray-11)] hover:bg-[var(--gray-1)] hover:text-[var(--gray-12)] px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2",
                isEditing && "border-[var(--primary-6)] text-[var(--primary-9)] bg-[var(--primary-1)]"
              )}
            >
              <Icon name="tabler:edit" className="size-4" />
              <span>Manual Correction</span>
            </Button>

            <div className="h-6 w-px bg-[var(--gray-3)] mx-1" />

            {isEditing && (
              <Button
                onClick={() => onApprove?.("Save")}
                loading={approveLoading}
                className='cursor-pointer bg-[var(--primary-9)] hover:bg-[var(--primary-10)] text-white border-none shadow-md shadow-primary-9/10 px-6 py-2 rounded-xl font-bold'
              >
                <span>Save</span>
              </Button>
            )}

            {actions?.map((action: any) => (
              <Button
                key={action?.value}
                onClick={() => onApprove?.(action?.value)}
                loading={approveLoading}
                className={cn(
                  'cursor-pointer px-6 py-2 rounded-xl font-bold transition-all flex items-center gap-2',
                  action?.label === 'Verified' || action?.label === 'Approve'
                    ? 'bg-[var(--indigo-9)] hover:bg-[var(--indigo-10)] text-white shadow-md shadow-indigo-9/10'
                    : 'bg-[var(--gray-2)] hover:bg-[var(--gray-3)] text-[var(--gray-12)] border border-[var(--gray-3)]'
                )}
              >
                {action?.icon && <Icon name={action?.icon} className="size-5" />}
                <span>{action?.label}</span>
              </Button>
            ))}
          </div>
        )}
      </div>
    </OverlayHeaderWrapper >
  )
}

Header.displayName = 'Header'
export default Header