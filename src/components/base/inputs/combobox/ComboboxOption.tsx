import { Combobox as Base } from '@mantine/core'
import React from 'react'
import type { Option } from '@/types/option'
import Icon from '@/components/base/Icon'
import cn from '@/utils/cn'
import type { SelectVariant } from '../types'

interface Props extends Option {
  icon?: string
  isSelected?: boolean
  variant?: SelectVariant
}

const Icons = {
  multiple: {
    default: 'material-symbols-light:square-outline-rounded',
    selected: 'material-symbols:check-box-rounded',
  },
  single: {
    default: 'material-symbols-light:circle-outline',
    selected: 'akar-icons:radio-fill',
  },
} as const

const ComboboxOption: React.FC<Props> = ({
  description,
  disabled,
  icon,
  id,
  isSelected,
  name,
  variant = 'single',
}) => {
  const computedClassName = cn(
    'group flex min-h-9 gap-2.5 rounded px-1.5 py-1 hover:bg-surface-raised-hover hover:transition-colors data-[combobox-selected]:bg-surface-raised-hover',
    !description && 'items-center',
  )

  const iconName =
    icon ?? (isSelected ? Icons[variant].selected : Icons[variant].default)

  const iconClassName = cn(
    icon
      ? 'text-gray-500'
      : isSelected
        ? 'text-primary'
        : 'size-5 text-gray-600/30',
  )

  return (
    <Base.Option
      active={isSelected}
      className={computedClassName}
      disabled={disabled}
      value={String(id)}
    >
      <div className='flex size-5 items-center justify-center'>
        <Icon className={iconClassName} name={iconName} />
      </div>

      <div>
        <div className='text-sm font-medium text-gray-700'>{name}</div>
        {description && (
          <div className='mt-1 text-sx text-gray-500'>{description}</div>
        )}
      </div>
    </Base.Option>
  )
}

ComboboxOption.displayName = 'ComboboxOption'
export default React.memo(ComboboxOption)
