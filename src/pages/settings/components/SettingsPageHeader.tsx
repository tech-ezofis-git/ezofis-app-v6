import type { ReactNode } from 'react'
import { useMemo } from 'react'
import IconButton from '@/components/base/button/IconButton'
import Tooltip from '@/components/base/Tooltip'
import cn from '@/utils/cn'
import { createSettingsListBreadcrumbs } from '../helpers/settingsBreadcrumbs'
import useSettingsTopbar from '../hooks/useSettingsTopbar'

export type SettingsAddAction = {
  onClick: () => void
  tooltip: string
}

type SettingsPageHeaderProps = {
  actions?: ReactNode
  description?: string
  leading?: ReactNode
  title: string
  toolbar?: ReactNode
  onBack?: () => void
}

export function SettingsHeaderAddButton({ onClick, tooltip }: SettingsAddAction) {
  return (
    <Tooltip content={tooltip} position='top'>
      <IconButton
        ariaLabel={tooltip}
        color='primary'
        icon='lucide:plus'
        size='lg'
        variant='solid'
        onClick={onClick}
      />
    </Tooltip>
  )
}

export default function SettingsPageHeader({
  actions,
  leading,
  onBack,
  title,
  toolbar,
}: SettingsPageHeaderProps) {
  const breadcrumbConfig = useMemo(
    () => createSettingsListBreadcrumbs(title, onBack),
    [onBack, title],
  )

  useSettingsTopbar(breadcrumbConfig)

  const hasRightContent = Boolean(toolbar || actions)
  const hasLeftContent = Boolean(onBack || leading)

  if (!hasLeftContent && !hasRightContent) {
    return null
  }

  return (
    <div className='border-b border-gray-3 bg-surface px-6 py-4 md:px-8'>
      <div
        className={cn(
          'flex flex-wrap items-center gap-4',
          hasRightContent ? 'justify-between' : '',
        )}
      >
        <div className='flex min-w-0 flex-1 flex-wrap items-center gap-3'>
          {onBack ? (
            <IconButton
              ariaLabel='Back'
              color='gray'
              icon='lucide:arrow-left'
              size='sm'
              variant='ghost'
              onClick={onBack}
            />
          ) : null}
          {leading}
        </div>

        {hasRightContent ? (
          <div className='flex flex-wrap items-center justify-end gap-2'>
            {toolbar}
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  )
}
