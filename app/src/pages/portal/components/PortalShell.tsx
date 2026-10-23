import type { ReactNode } from 'react'
import { useLingui } from '@lingui/react/macro'
import type { PortalConfig } from '@/pages/settings/helpers/portalConfigStorage'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import { AnimateFadeIn } from '@/components/common/animations'
import Tooltip from '@/components/base/Tooltip'
import cn from '@/utils/cn'
import {
  PORTAL_SECTION_ATTACHMENTS,
  PORTAL_SECTION_COMMENTS,
  scrollToPortalSection,
} from '../helpers/portalDetail'
import PortalBackButton from './PortalBackButton'
import PortalBrandMark from './PortalBrandMark'

// Attachments / Comments shortcuts beside the header actions, as in the
// in-app new request header: each shows its count and scrolls to its section.
function PortalSectionButtons({
  attachmentCount = 0,
  commentCount = 0,
}: {
  attachmentCount?: number
  commentCount?: number
}) {
  const { t } = useLingui()
  const buttons = [
    {
      count: attachmentCount,
      icon: 'tabler:paperclip',
      id: PORTAL_SECTION_ATTACHMENTS,
      label: t`Attachments`,
    },
    {
      count: commentCount,
      icon: 'tabler:message-circle',
      id: PORTAL_SECTION_COMMENTS,
      label: t`Comments`,
    },
  ]
  return (
    <div className='flex shrink-0 items-center gap-1'>
      {buttons.map((button) => (
        <Tooltip content={button.label} key={button.id} position='bottom'>
          <button
            aria-label={button.label}
            className='relative flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-gray-10 transition-all hover:bg-gray-3 hover:text-gray-12 active:scale-95 active:bg-gray-4'
            type='button'
            onClick={() => scrollToPortalSection(button.id)}
          >
            <Icon className='size-4.5' name={button.icon} />
            {button.count > 0 ? (
              <span className='absolute -top-0.5 -right-0.5 flex h-4 min-w-4 animate-in items-center justify-center rounded-full bg-primary-9 px-1 text-[10px] font-bold text-text-on-accent zoom-in-50'>
                {button.count}
              </span>
            ) : null}
          </button>
        </Tooltip>
      ))}
    </div>
  )
}

type PortalDetailHeader = {
  acting?: boolean
  actions?: { label: string; value: string }[]
  attachmentCount?: number
  commentCount?: number
  requestNo: string
  status: string
  statusClassName: string
  onAction?: (value: string) => void
  onBack: () => void
}

type PortalShellProps = {
  children: ReactNode
  detail?: PortalDetailHeader | null
  email: string
  fill?: boolean
  portal: PortalConfig
  wizard?: PortalWizardHeader | null
  onSignOut: () => void
}

type PortalWizardHeader = {
  attachmentCount?: number
  canSubmit: boolean
  commentCount?: number
  stageLabel?: string
  submitLabel?: string
  submitting: boolean
  title: string
  onCancel: () => void
  onSubmit: () => void
}

export default function PortalShell({
  children,
  detail,
  email,
  fill = false,
  portal,
  wizard,
  onSignOut,
}: PortalShellProps) {
  const { t } = useLingui()
  const brandName =
    portal.branding?.brandName?.trim() || portal.name || 'EZOFIS'
  const contentWidth = fill ? 'w-full' : 'max-w-6xl'

  return (
    <div
      className={cn(
        'flex flex-col bg-gray-2',
        fill ? 'h-svh overflow-hidden' : 'min-h-svh',
      )}
    >
      <AnimateFadeIn className='shrink-0'>
        <header className='border-b border-gray-4 bg-surface px-4 py-3 sm:px-6 lg:px-8'>
          {/* Full width on every view, as on the request pages */}
          <div className='mx-auto flex w-full items-center justify-between gap-3'>
            <PortalBrandMark
              branding={portal.branding}
              fallbackName={brandName}
            />
            <div className='flex min-w-0 items-center gap-2 sm:gap-3'>
              <span className='hidden min-w-0 items-center gap-2 text-13 text-gray-10 sm:inline-flex'>
                <Icon
                  className='size-4 shrink-0 text-gray-9'
                  name='lucide:user'
                />
                <span className='truncate'>{email}</span>
              </span>
              <Button
                color='gray'
                icon='lucide:log-out'
                label={t`Sign out`}
                size='sm'
                variant='outline'
                onClick={onSignOut}
              />
            </div>
          </div>
        </header>

        {wizard ? (
          <div className='border-b border-gray-4 bg-surface px-4 py-3 sm:px-6 lg:px-8'>
            <div
              className={cn(
                'mx-auto flex items-center justify-between gap-3',
                contentWidth,
              )}
            >
              <div className='flex min-w-0 flex-1 items-center gap-3'>
                <PortalBackButton label={t`Back`} onClick={wizard.onCancel} />
                {/* The current stage (the workflow's start step), falling
                    back to the workflow name */}
                <h1
                  className='min-w-0 truncate text-15 font-semibold text-gray-13'
                  title={wizard.stageLabel ? wizard.title : undefined}
                >
                  {wizard.stageLabel || wizard.title}
                </h1>
              </div>
              <div className='flex shrink-0 items-center gap-2 sm:gap-3'>
                <PortalSectionButtons
                  attachmentCount={wizard.attachmentCount}
                  commentCount={wizard.commentCount}
                />
                <Button
                  className='shrink-0 rounded-lg'
                  disabled={!wizard.canSubmit}
                  label={wizard.submitLabel || t`Submit`}
                  loading={wizard.submitting}
                  onClick={wizard.onSubmit}
                />
              </div>
            </div>
          </div>
        ) : detail ? (
          <div className='border-b border-gray-4 bg-surface px-4 py-3 sm:px-6 lg:px-8'>
            <div
              className={cn(
                'mx-auto flex items-center justify-between gap-3',
                contentWidth,
              )}
            >
              <div className='flex min-w-0 flex-1 items-center gap-3'>
                <PortalBackButton label={t`Back`} onClick={detail.onBack} />
                <h1 className='min-w-0 truncate text-15 font-semibold text-gray-13'>
                  {detail.requestNo}
                </h1>
                <span
                  className={cn(
                    'inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-12 font-medium',
                    detail.statusClassName,
                  )}
                >
                  <span className='size-1.5 rounded-full bg-current' />
                  {detail.status}
                </span>
              </div>
              <div className='flex shrink-0 flex-wrap items-center gap-2 sm:gap-3'>
                <PortalSectionButtons
                  attachmentCount={detail.attachmentCount}
                  commentCount={detail.commentCount}
                />
                {(detail.actions || []).map((action) => {
                    const label = action.label.toLowerCase()
                    const color = label.includes('reject')
                      ? 'red'
                      : label.includes('approve')
                        ? 'green'
                        : 'primary'
                    return (
                      <Button
                        className='rounded-lg'
                        color={color}
                        key={action.value}
                        label={action.label}
                        loading={Boolean(detail.acting)}
                        onClick={() => detail.onAction?.(action.value)}
                      />
                    )
                  })}
              </div>
            </div>
          </div>
        ) : null}
      </AnimateFadeIn>

      <main
        className={cn(
          'mx-auto flex w-full flex-1 flex-col',
          fill
            ? 'min-h-0 overflow-hidden'
            : 'max-w-6xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8',
        )}
      >
        {fill ? (
          <div className='flex min-h-0 flex-1 flex-col'>{children}</div>
        ) : (
          children
        )}
      </main>
    </div>
  )
}
