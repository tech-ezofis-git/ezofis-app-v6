import { Combobox as Base } from '@mantine/core'
import { memo } from 'react'
import type { Option } from '@/types/option'
import { DynamicIcon } from '@/pages/folders/components/icons'
import cn from '@/utils/cn'
import type { SelectVariant } from '../shared/types'
import InputCheckboxIndicator from '../InputCheckboxIndicator'
import InputRadioIndicator from '../InputRadioIndicator'

interface Props extends Option {
  icon?: string
  iconKey?: string
  isSelected?: boolean
  variant?: SelectVariant
}

const ComboboxOption = ({
  description,
  disabled,
  iconKey,
  id,
  isSelected,
  name,
  variant = 'single',
}: Props) => {
  const _className = cn(
    'group flex min-h-9 gap-2.5 rounded px-1.5 py-1 transition-colors hover:bg-gray-4 data-[combobox-selected]:bg-gray-4',
    !description && 'items-center',
  )

  return (
    <Base.Option
      active={isSelected}
      className={_className}
      disabled={disabled}
      value={String(id)}
    >
      {variant === 'multiple' ? (
        <InputCheckboxIndicator checked={isSelected} />
      ) : (
        <InputRadioIndicator checked={isSelected} />
      )}

      {iconKey ? (
        <DynamicIcon className='h-4 w-4 shrink-0 text-gray-11' name={iconKey} />
      ) : null}

      <div className='min-w-0 flex-1'>
        <div className='truncate text-13 font-medium text-gray-12'>{name}</div>
        {description && (
          <div className='mt-1 text-xs text-gray-10'>{description}</div>
        )}
      </div>
    </Base.Option>
  )
}

ComboboxOption.displayName = 'ComboboxOption'
export default memo(ComboboxOption)
