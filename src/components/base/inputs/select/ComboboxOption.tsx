import { Combobox as Base } from '@mantine/core'
import { memo } from 'react'
import type { Option } from '@/types/option'
import cn from '@/utils/cn'
import type { SelectVariant } from '../shared/types'
import InputCheckboxIndicator from '../InputCheckboxIndicator'
import InputRadioIndicator from '../InputRadioIndicator'

interface Props extends Option {
  icon?: string
  isSelected?: boolean
  variant?: SelectVariant
}

const ComboboxOption = ({
  description,
  disabled,
  id,
  isSelected,
  name,
  variant = 'single',
}: Props) => {
  const _className = cn(
    'group flex min-h-8 gap-2.5 rounded px-1.5 py-1 transition-colors hover:bg-gray-4 data-[combobox-selected]:bg-gray-4',
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

      <div>
        <div className='text-13 font-medium text-gray-12'>{name}</div>
        {description && (
          <div className='mt-1 text-12 text-gray-10'>{description}</div>
        )}
      </div>
    </Base.Option>
  )
}

ComboboxOption.displayName = 'ComboboxOption'
export default memo(ComboboxOption)
