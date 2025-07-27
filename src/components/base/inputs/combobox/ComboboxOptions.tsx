import { Combobox as Base, type ComboboxStore } from '@mantine/core'
import React, { useRef } from 'react'
import type { Option } from '@/types/option'
import ScrollArea from '@/components/base/ScrollArea'
import cn from '@/utils/cn'
import type { SelectVariant } from '../types'
import ComboboxOption from './ComboboxOption'

interface Props {
  comboboxStore: ComboboxStore
  options: Option[]
  creatable?: boolean
  search?: string
  value?: Option[] | null
  variant?: SelectVariant
  onBottomReached?: () => void
  onChange?: (value: Option | null) => void
}

const ComboboxOptions: React.FC<Props> = ({
  comboboxStore,
  creatable,
  options,
  search,
  value,
  variant,
  onBottomReached,
  onChange,
}) => {
  const counter = useRef(-1)
  const hasOptions = options.length > 0

  const isSelected = (id: number) => value?.some((item) => item.id === id)

  const handleClick = (option: Option) => {
    if (option.disabled) return
    onChange?.(option)
    comboboxStore.closeDropdown()
  }

  const handleCreate = () => {
    if (search) {
      const id = counter.current--
      handleClick({ description: '', disabled: false, id, name: search })
    }
  }

  return (
    <Base.Options className='p-1'>
      <ScrollArea height={216} onBottomReached={onBottomReached}>
        {!hasOptions && !creatable && (
          <div className='flex h-10 items-center justify-center text-sx font-medium text-gray-500'>
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
              icon='tabler:plus'
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
