import type { ReactNode } from 'react'
import { useLingui } from '@lingui/react/macro'
import type { StageTrailItem } from '@/pages/requests/utils/workflow.utils'
import type { PortalConfig } from '@/pages/settings/helpers/portalConfigStorage'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import Tooltip from '@/components/base/Tooltip'
import { AnimateFadeIn } from '@/components/common/animations'
import StageTrail from '@/pages/requests/components/request/components/StageTrail'
import cn from '@/utils/cn'
import {
  PORTAL_SECTION_ATTACHMENTS,
  PORTAL_SECTION_COMMENTS,
  PORTAL_SECTION_HISTORY,
  scrollToPortalSection,
} from '../helpers/portalDetail'
import PortalBackButton from './PortalBackButton'
import PortalBrandMark from './PortalBrandMark'

/** Request-level info for the wizard / detail header. */
export type PortalHeaderInfo = {
  /** Available Budget (or master Budget); null when the workflow has none. */
  budget: string | null
  stageTrail: StageTrailItem[]
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
  headerInfo?: PortalHeaderInfo | null
  portal: PortalConfig
  wizard?: PortalWizardHeader | null
  onSignOut: () => void
}

type PortalWizardHeader = {
  attachmentCount?: number
  canSubmit: boolean
  commentCount?: number
  // Attachments / Comments shortcuts: only for form-initiated workflows
  showSectionButtons?: boolean
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
  headerInfo,
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
        // Phones: soft secondary tint behind the floating white cards.
        'flex flex-col bg-gray-2 max-md:bg-secondary-2',
        fill ? 'h-svh overflow-hidden' : 'min-h-svh',
      )}
    >
      {/* Header stays pinned while the page scrolls (respects the notch). */}
      <AnimateFadeIn className={cn('shrink-0', !fill && 'sticky top-0 z-30')}>
        <header className='flex min-h-14 items-center border-b border-gray-4 bg-surface/95 px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 backdrop-blur sm:px-6 sm:py-3 lg:px-8'>
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
              {/* Phones: avatar initial + icon-only sign out (44px target). */}
              <span
                aria-label={email}
                className='flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-3 text-13 font-semibold text-primary-11 uppercase sm:hidden'
                role='img'
                title={email}
              >
                {email.trim().charAt(0) || '?'}
              </span>
              <IconButton
                ariaLabel={t`Sign out`}
                className='size-11 sm:hidden'
                color='gray'
                icon='lucide:log-out'
                size='md'
                variant='ghost'
                onClick={onSignOut}
              />
              <Button
                className='max-sm:hidden'
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
              {headerInfo?.stageTrail.length ? (
                <div className='hidden min-w-0 flex-auto items-center justify-center md:flex'>
                  <StageTrail items={headerInfo.stageTrail} />
                </div>
              ) : null}
              <div className='flex shrink-0 items-center gap-2 sm:gap-3'>
                <PortalBudget value={headerInfo?.budget} />
                {wizard.showSectionButtons ? (
                  <PortalSectionButtons
                    attachmentCount={wizard.attachmentCount}
                    commentCount={wizard.commentCount}
                  />
                ) : null}
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
            {/* Phones: actions wrap onto their own row instead of overflowing. */}
            <div
              className={cn(
                'mx-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-2',
                contentWidth,
              )}
            >
              <div className='flex min-w-0 flex-1 items-center gap-2 sm:gap-3'>
                <PortalBackButton label={t`Back`} onClick={detail.onBack} />
                <h1 className='min-w-0 truncate text-15 font-semibold text-gray-13'>
                  {detail.requestNo}
                </h1>
                {detail.status ? (
                  <span
                    className={cn(
                      'inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-12 font-medium',
                      detail.statusClassName,
                    )}
                  >
                    <span className='size-1.5 rounded-full bg-current' />
                    {detail.status}
                  </span>
                ) : null}
              </div>
              {headerInfo?.stageTrail.length ? (
                <div className='hidden min-w-0 flex-auto items-center justify-center lg:flex'>
                  <StageTrail items={headerInfo.stageTrail} />
                </div>
              ) : null}
              {/* Budget + section shortcuts stay on the request-number row,
                  even on phones */}
              <div className='flex shrink-0 items-center gap-1.5 sm:gap-3'>
                <PortalBudget value={headerInfo?.budget} />
                <PortalSectionButtons
                  attachmentCount={detail.attachmentCount}
                  commentCount={detail.commentCount}
                  showHistory
                />
              </div>
              {/* Review actions: inline from sm, their own row on phones */}
              {detail.actions?.length ? (
                <div className='flex shrink-0 flex-wrap items-center gap-2 max-sm:w-full max-sm:justify-end'>
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
              ) : null}
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

/** Budget block, like the request page header's. */
function PortalBudget({ value }: { value?: string | null }) {
  const { t } = useLingui()
  const raw = String(value ?? '').trim()
  if (!raw) return null
  const amount = Number(raw.replace(/[^0-9.-]/g, ''))
  const isAmount =
    /\d/.test(raw) && Number.isFinite(amount) && !/[a-z]/i.test(raw)
  return (
    <div className='flex shrink-0 flex-col border-r border-gray-3 pr-2 text-right sm:pr-3'>
      <span className='mb-1 text-[10px] leading-none font-semibold whitespace-nowrap text-gray-11'>
        {t`Budget`}
      </span>
      <span className='text-13 leading-tight font-semibold whitespace-nowrap text-primary-9'>
        {isAmount
          ? `$ ${amount.toLocaleString(undefined, {
              maximumFractionDigits: 2,
              minimumFractionDigits: 2,
            })}`
          : raw}
      </span>
    </div>
  )
}

// Attachments / Comments (and, on a ticket, History) shortcuts beside the
// header actions, as in the in-app new request header: each scrolls to its
// section, Attachments and Comments with their counts.
function PortalSectionButtons({
  attachmentCount = 0,
  commentCount = 0,
  showHistory = false,
}: {
  attachmentCount?: number
  commentCount?: number
  showHistory?: boolean
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
    ...(showHistory
      ? [
          {
            count: 0,
            icon: 'tabler:history',
            id: PORTAL_SECTION_HISTORY,
            label: t`History`,
          },
        ]
      : []),
  ]
  return (
    <div className='flex shrink-0 items-center gap-0.5 sm:gap-1'>
      {buttons.map((button) => (
        <Tooltip content={button.label} key={button.id} position='bottom'>
          <button
            aria-label={button.label}
            className='relative flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-gray-10 transition-all hover:bg-gray-3 hover:text-gray-12 active:scale-95 active:bg-gray-4 sm:size-9'
            type='button'
            onClick={() => scrollToPortalSection(button.id)}
          >
            <Icon className='size-4.5' name={button.icon} />
            {button.count > 0 ? (
              <span className='animate-in zoom-in-50 absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-9 px-1 text-[10px] font-bold text-text-on-accent'>
                {button.count}
              </span>
            ) : null}
          </button>
        </Tooltip>
      ))}
    </div>
  )
}
