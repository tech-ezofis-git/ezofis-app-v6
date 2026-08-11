import React from 'react'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'

export interface FilterToolbarProps {
  actions?: ToolbarAction[]
}

export interface ToolbarAction {
  id: string
  disabled?: boolean
  icon?: string | React.ElementType
  isIconButton?: boolean
  label?: string
  tooltip?: string
  onClick: () => void
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

export function FilterToolbar({ actions }: FilterToolbarProps) {
  if (!actions || actions.length === 0) return null

  return (
    <div className='ml-auto flex items-center gap-1.5'>
      {actions.map((action) => {
        const iconName = resolveIconName(action.icon)
        const IconComp = typeof action.icon === 'function' ? action.icon : null

        if (action.isIconButton || !action.label) {
          return (
            <IconButton
              ariaLabel={action.tooltip || action.label || action.id}
              color='gray'
              disabled={action.disabled}
              icon={iconName}
              key={action.id}
              size='sm'
              tooltip={action.tooltip || action.label}
              variant='outline'
              onClick={action.onClick}
            >
              {IconComp ? <IconComp className='h-4 w-4' /> : null}
            </IconButton>
          )
        }

        return (
          <Button
            className='flex items-center gap-1.5'
            color='gray'
            disabled={action.disabled}
            icon={iconName}
            key={action.id}
            size='sm'
            variant='outline'
            onClick={action.onClick}
          >
            {IconComp ? <IconComp className='h-3.5 w-3.5' /> : null}
            {!iconName && !IconComp && action.icon ? (
              <Icon className='h-3.5 w-3.5' name='tabler:circle' />
            ) : null}
            <span>{action.label}</span>
          </Button>
        )
      })}
    </div>
  )
}
