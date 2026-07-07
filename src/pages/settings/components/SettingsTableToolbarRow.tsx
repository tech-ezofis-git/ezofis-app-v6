import type { ReactNode } from 'react'
import IconButton from '@/components/base/button/IconButton'
import Tooltip from '@/components/base/Tooltip'
import cn from '@/utils/cn'
import type { SettingsAddAction } from './SettingsPageHeader'

type SettingsTableToolbarRowProps = {
  addAction?: SettingsAddAction
  className?: string
  toolbar: ReactNode
}

export default function SettingsTableToolbarRow({
  addAction,
  className,
  toolbar,
}: SettingsTableToolbarRowProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-end gap-2 border-b border-[var(--gray-2)] bg-surface px-6 py-2 md:px-8',
        className,
      )}
    >
      {toolbar}
      {addAction ? (
        <Tooltip content={addAction.tooltip} position='top'>
          <IconButton
            ariaLabel={addAction.tooltip}
            color='primary'
            icon='lucide:plus'
            size='lg'
            variant='solid'
            onClick={addAction.onClick}
          />
        </Tooltip>
      ) : null}
    </div>
  )
}
