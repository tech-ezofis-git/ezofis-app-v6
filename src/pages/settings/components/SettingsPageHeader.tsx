import type { ReactNode } from 'react'
import IconButton from '@/components/base/button/IconButton'
import Tooltip from '@/components/base/Tooltip'
import cn from '@/utils/cn'

export type SettingsAddAction = {
  onClick: () => void
  tooltip: string
}

type SettingsPageHeaderProps = {
  actions?: ReactNode
  description?: string
  title: string
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
  description,
  onBack,
  title,
}: SettingsPageHeaderProps) {
  return (
    <div className='border-b border-gray-3 bg-surface px-6 py-4 md:px-8'>
      <div
        className={cn(
          'flex flex-wrap items-start gap-4',
          actions ? 'justify-between' : '',
        )}
      >
        <div className='flex min-w-0 items-start gap-3'>
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

          <div className='min-w-0'>
            <h1 className='text-18/6 font-semibold tracking-tight text-gray-13'>
              {title}
            </h1>

            {description ? (
              <p className='text-13/5 text-gray-11'>{description}</p>
            ) : null}
          </div>
        </div>

        {actions ? (
          <div className='flex flex-wrap items-end justify-end gap-2'>
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  )
}
