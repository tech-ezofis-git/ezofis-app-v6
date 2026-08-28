import type { ReactNode } from 'react'
import { useLingui } from '@lingui/react/macro'
import type { PortalConfig } from '@/pages/settings/helpers/portalConfigStorage'
import Button from '@/components/base/button/Button'
import { AnimateFadeIn } from '@/components/common/animations'
import ThemeSwitcher from '@/layouts/auth/components/ThemeSwitcher'
import cn from '@/utils/cn'
import PortalBackButton from './PortalBackButton'
import PortalBrandMark from './PortalBrandMark'

type PortalDetailHeader = {
  acting?: boolean
  actions?: { label: string; value: string }[]
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
  canSubmit: boolean
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

  return (
    <div
      className={cn(
        'flex flex-col bg-gray-2',
        fill ? 'h-svh overflow-hidden' : 'min-h-svh',
      )}
    >
      <AnimateFadeIn className='shrink-0'>
        <header className='border-b border-gray-4 bg-surface px-4 py-3 sm:px-6 lg:px-8'>
          <div
            className={cn(
              'mx-auto flex items-center justify-between gap-3',
              fill ? 'w-full' : 'max-w-6xl',
            )}
          >
            {wizard ? (
              <>
                <div className='flex min-w-0 items-center gap-3'>
                  <PortalBackButton
                    label={t`Cancel`}
                    onClick={wizard.onCancel}
                  />
                  <div className='min-w-0 truncate text-15 font-semibold text-gray-13'>
                    {wizard.title}
                  </div>
                </div>
                <Button
                  className='shrink-0 rounded-lg'
                  disabled={!wizard.canSubmit}
                  label={wizard.submitLabel || t`Submit`}
                  loading={wizard.submitting}
                  onClick={wizard.onSubmit}
                />
              </>
            ) : detail ? (
              <>
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
                {detail.actions && detail.actions.length > 0 ? (
                  <div className='flex shrink-0 items-center gap-2 sm:gap-3'>
                    {detail.actions.map((action) => {
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
              </>
            ) : (
              <>
                <PortalBrandMark
                  branding={portal.branding}
                  fallbackName={brandName}
                />
                <div className='flex min-w-0 items-center gap-2 sm:gap-3'>
                  <span className='hidden truncate text-13 text-gray-10 sm:inline'>
                    {email}
                  </span>
                  <ThemeSwitcher />
                  <Button
                    color='gray'
                    icon='lucide:log-out'
                    label={t`Sign out`}
                    size='sm'
                    variant='outline'
                    onClick={onSignOut}
                  />
                </div>
              </>
            )}
          </div>
        </header>
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
