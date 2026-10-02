import { Combobox as Base, Tooltip as MantineTooltip } from '@mantine/core'
import { memo } from 'react'
import type { Option } from '@/types/option'
import Icon from '@/components/base/icon/Icon'
import { DynamicIcon } from '@/pages/folders/components/icons'
import cn from '@/utils/cn'
import type { SelectVariant } from '../shared/types'
import InputCheckboxIndicator from '../InputCheckboxIndicator'
import InputRadioIndicator from '../InputRadioIndicator'

interface Props extends Option {
  icon?: string
  iconKey?: string
  isSelected?: boolean
  /** Shown on the trailing edge of the option row (e.g. folder / workflow). */
  rightIconKey?: string
  variant?: SelectVariant
  wrapLabel?: boolean
}

const ComboboxOption = ({
  description,
  disabled,
  iconKey,
  id,
  isSelected,
  name,
  rightIconKey,
  variant = 'single',
  wrapLabel = false,
}: Props) => {
  const _className = cn(
    'group flex min-h-9 cursor-pointer gap-2.5 rounded px-1.5 py-1 transition-colors hover:bg-gray-4 data-[combobox-selected]:bg-gray-4',
    !description && !wrapLabel && 'items-center',
    wrapLabel && 'items-start',
    disabled && 'cursor-not-allowed',
  )

  const renderIcon = (
    key?: string,
    className = 'size-4 shrink-0 text-gray-11',
  ) => {
    if (!key) return null
    if (key.includes(':')) {
      return <Icon className={className} name={key} />
    }
    return (
      <DynamicIcon
        className={cn('h-4 w-4 shrink-0 text-gray-11', className)}
        name={key}
      />
    )
  }

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

      {renderIcon(iconKey)}

      <div className='min-w-0 flex-1'>
        <MantineTooltip
          disabled={wrapLabel || !name || name.length < 24}
          label={name}
          openDelay={250}
          position='top'
          w={240}
          zIndex={20050}
          multiline
          withArrow
          classNames={{
            tooltip:
              'rounded-md bg-gray-13 px-2.5 py-1.5 font-sans text-xs leading-relaxed font-normal break-words whitespace-normal text-white shadow-lg',
          }}
        >
          <div
            className={cn(
              'text-13 font-normal text-gray-12',
              wrapLabel ? 'break-words whitespace-normal' : 'truncate',
            )}
          >
            {name}
          </div>
        </MantineTooltip>
        {description && (
          <div className='mt-0.5 line-clamp-2 text-xs text-gray-10'>
            {description}
          </div>
        )}
      </div>

      {rightIconKey ? (
        <span className='ml-auto flex shrink-0 items-center self-center pl-2'>
          {renderIcon(
            rightIconKey,
            cn(
              'size-4 shrink-0',
              isSelected ? 'text-primary-9' : 'text-gray-10',
            ),
          )}
        </span>
      ) : null}
    </Base.Option>
  )
}

ComboboxOption.displayName = 'ComboboxOption'
export default memo(ComboboxOption)
