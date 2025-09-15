import { Combobox as Base } from '@mantine/core'
import { memo } from 'react'
import type { Option } from '@/types/option'
import InputCheckbox from '@/components/base/inputs/InputCheckbox'
import InputRadio from '@/components/base/inputs/InputRadio'
import cn from '@/utils/cn'
import type { SelectVariant } from '../shared/types'

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
      <div className='flex size-5 items-center justify-center'>
        {variant === 'multiple' ? (
          <InputCheckbox checked={isSelected} />
        ) : (
          <InputRadio checked={isSelected} />
        )}
      </div>

      <div>
        <div className='text-sm font-medium text-gray-11'>{name}</div>
        {description && (
          <div className='mt-1 text-sm text-gray-10'>{description}</div>
        )}
      </div>
    </Base.Option>
  )
}

ComboboxOption.displayName = 'ComboboxOption'
export default memo(ComboboxOption)
