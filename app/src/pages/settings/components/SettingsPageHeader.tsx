import type { ReactNode } from 'react'
import { useLingui } from '@lingui/react/macro'
import { useMemo } from 'react'
import IconButton from '@/components/base/button/IconButton'
import Tooltip from '@/components/base/Tooltip'
import cn from '@/utils/cn'
import { createSettingsListBreadcrumbs } from '../helpers/settingsBreadcrumbs'
import useSettingsTopbar from '../hooks/useSettingsTopbar'

export type SettingsAddAction = {
  tooltip: string
  onClick: () => void
}

type SettingsPageHeaderProps = {
  actions?: ReactNode
  description?: string
  leading?: ReactNode
  title: string
  toolbar?: ReactNode
  onBack?: () => void
}

export function SettingsHeaderAddButton({
  tooltip,
  onClick,
}: SettingsAddAction) {
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
  title,
  toolbar,
  onBack,
}: SettingsPageHeaderProps) {
  const { i18n, t } = useLingui()
  const breadcrumbConfig = useMemo(
    () => createSettingsListBreadcrumbs(title, onBack, t`Settings`),
    [i18n.locale, onBack, t, title],
  )

  useSettingsTopbar(breadcrumbConfig)

  const hasRightContent = Boolean(toolbar || actions)
  const hasLeftContent = Boolean(leading)

  if (!hasLeftContent && !hasRightContent) {
    return null
  }

  return (
    <div className='border-b border-gray-3 bg-surface px-6 py-3'>
      <div
        className={cn(
          'flex flex-wrap items-center gap-4',
          hasRightContent ? 'justify-between' : '',
        )}
      >
        <div className='flex min-w-0 flex-1 flex-wrap items-center gap-3'>
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
