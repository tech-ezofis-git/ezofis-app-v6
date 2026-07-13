import { Combobox as Base, type ComboboxStore } from '@mantine/core'
import { useRef } from 'react'
import type { Option } from '@/types/option'
import ScrollArea from '@/components/base/scroll-area/ScrollArea'
import cn from '@/utils/cn'
import type { SelectVariant } from '../shared/types'
import ComboboxOption from './ComboboxOption'

interface Props {
  comboboxStore: ComboboxStore
  options: Option[]
  search: string
  value: Option[]
  creatable?: boolean
  variant?: SelectVariant
  onBottomReached?: () => void
  onChange: (value: Option[]) => void
}

const ComboboxOptions = ({
  comboboxStore,
  creatable,
  options,
  search,
  value,
  variant,
  onBottomReached,
  onChange,
}: Props) => {
  const counter = useRef(-1)
  const hasOptions = options.length > 0

  const isSelected = (id: string | number) =>
    value.some((item) => item.id === id)

  const handleClick = (option: Option) => {
    if (option.disabled) return

    const exists = value.some((v) => v.id === option.id)

    if (variant === 'single') {
      onChange(exists ? [] : [option])
      comboboxStore.closeDropdown()
    }

    if (variant === 'multiple') {
      onChange(
        exists ? value.filter((v) => v.id !== option.id) : [...value, option],
      )
    }
  }

  const handleCreate = () => {
    if (search) {
      const id = counter.current--
      handleClick({ description: '', disabled: false, id, name: search })
    }
  }

  return (
    <Base.Options className='p-1'>
      <ScrollArea
        height={216}
        overscrollBehavior='contain'
        onBottomReached={onBottomReached}
      >
        {!hasOptions && !creatable && (
          <div className='flex h-10 items-center justify-center text-13 text-gray-11'>
            No data found
          </div>
        )}

        {hasOptions && (
          <div
            className={cn('flex flex-col', options[0].description && 'gap-1')}
          >
            {options.map((option) => (
              <div key={option.id} onClick={() => handleClick(option)}>
                <ComboboxOption
                  {...option}
                  iconKey={(option as Option & { iconKey?: string }).iconKey}
                  isSelected={isSelected(option.id)}
                  variant={variant}
                />
              </div>
            ))}
          </div>
        )}

        {creatable && search && (
          <div onClick={handleCreate}>
            <ComboboxOption
              icon='lucide:plus'
              id={0}
              name={`Create "${search}"`}
            />
          </div>
        )}
      </ScrollArea>
    </Base.Options>
  )
}

ComboboxOptions.displayName = 'ComboboxOptions'
export default ComboboxOptions
