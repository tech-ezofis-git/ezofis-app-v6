import React, { useState } from 'react'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'

export interface FilterToolbarProps {
  actions?: ToolbarAction[]
}

export interface ToolbarAction {
  id: string
  disabled?: boolean
  icon?: string | React.ElementType
  isIconButton?: boolean
  label?: string
  loading?: boolean
  spin?: boolean
  tooltip?: string
  onClick: () => void | Promise<void>
}

const resolveIconName = (
  icon?: string | React.ElementType,
): string | undefined => {
  if (typeof icon !== 'string') return undefined
  if (icon.includes(':')) return icon

  const legacyMap: Record<string, string> = {
    columns: 'tabler:columns',
    download: 'tabler:download',
    export: 'tabler:file-export',
    filter: 'tabler:filter',
    import: 'tabler:file-import',
    refresh: 'tabler:refresh',
    upload: 'tabler:upload',
  }

  return legacyMap[icon] || `lucide:${icon}`
}

function ToolbarActionButton({ action }: { action: ToolbarAction }) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const isRefreshAction =
    action.id === 'refresh' ||
    (typeof action.icon === 'string' && action.icon.includes('refresh'))

  const isSpinning = Boolean(
    action.spin || action.loading || (isRefreshAction && isRefreshing),
  )

  const handleClick = async () => {
    if (isSpinning) return
    if (isRefreshAction) {
      try {
        setIsRefreshing(true)
        await Promise.resolve(action.onClick())
      } finally {
        setIsRefreshing(false)
      }
    } else {
      action.onClick()
    }
  }

  const iconName = resolveIconName(action.icon)
  const IconComp = typeof action.icon === 'function' ? action.icon : null

  if (action.isIconButton || !action.label) {
    return (
      <IconButton
        ariaLabel={action.tooltip || action.label || action.id}
        color='gray'
        disabled={action.disabled || isSpinning}
        icon={iconName}
        iconClass={isSpinning ? 'animate-spin' : undefined}
        size='sm'
        tooltip={action.tooltip || action.label}
        variant='outline'
        onClick={() => void handleClick()}
      >
        {IconComp ? (
          <IconComp className={cn('h-4 w-4', isSpinning && 'animate-spin')} />
        ) : null}
      </IconButton>
    )
  }

  return (
    <Button
      className='flex items-center gap-1.5'
      color='gray'
      disabled={action.disabled || isSpinning}
      icon={iconName}
      iconClass={isSpinning ? 'animate-spin' : undefined}
      loading={isSpinning}
      size='sm'
      variant='outline'
      onClick={() => void handleClick()}
    >
      {IconComp ? (
        <IconComp className={cn('h-3.5 w-3.5', isSpinning && 'animate-spin')} />
      ) : null}
      {!iconName && !IconComp && action.icon && !isSpinning ? (
        <Icon className='h-3.5 w-3.5' name='tabler:circle' />
      ) : null}
      <span>{action.label}</span>
    </Button>
  )
}

export function FilterToolbar({ actions }: FilterToolbarProps) {
  if (!actions || actions.length === 0) return null

  return (
    <div className='ml-auto flex items-center gap-1.5'>
      {actions.map((action) => (
        <ToolbarActionButton action={action} key={action.id} />
      ))}
    </div>
  )
}
