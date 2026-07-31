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
  createOptionLabel?: (search: string) => string
  /** When set, creatable row only shows if this returns true for current search. */
  isCreatableSearch?: (search: string) => boolean
  variant?: SelectVariant
  onBottomReached?: () => void
  onChange: (value: Option[]) => void
}

const ComboboxOptions = ({
  comboboxStore,
  creatable,
  createOptionLabel,
  isCreatableSearch,
  options,
  search,
  value,
  variant,
  onBottomReached,
  onChange,
}: Props) => {
  const counter = useRef(-1)
  const hasOptions = options.length > 0
  const trimmedSearch = search.trim()
  const canCreate =
    Boolean(creatable) &&
    Boolean(trimmedSearch) &&
    (!isCreatableSearch || isCreatableSearch(trimmedSearch)) &&
    !options.some(
      (option) =>
        option.name.toLowerCase() === trimmedSearch.toLowerCase() ||
        String(option.value || '').toLowerCase() ===
          trimmedSearch.toLowerCase(),
    ) &&
    !value.some(
      (option) =>
        option.name.toLowerCase() === trimmedSearch.toLowerCase() ||
        String(option.value || '').toLowerCase() ===
          trimmedSearch.toLowerCase(),
    )

  const isSelected = (id: string | number) =>
    value.some((item) => String(item.id) === String(id))

  const handleClick = (option: Option) => {
    if (option.disabled) return

    const exists = value.some((v) => String(v.id) === String(option.id))

    if (variant === 'single') {
      onChange(exists ? [] : [option])
      comboboxStore.closeDropdown()
    }

    if (variant === 'multiple') {
      onChange(
        exists
          ? value.filter((v) => String(v.id) !== String(option.id))
          : [...value, option],
      )
    }
  }

  const handleCreate = () => {
    if (search) {
      const id = counter.current--
      handleClick({
        description: '',
        disabled: false,
        id,
        name: search.trim(),
        value: search.trim(),
      })
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

        {canCreate && (
          <div onClick={handleCreate}>
            <ComboboxOption
              icon='lucide:plus'
              id={0}
              name={
                createOptionLabel?.(trimmedSearch) ||
                `Create "${trimmedSearch}"`
              }
            />
          </div>
        )}
      </ScrollArea>
    </Base.Options>
  )
}

ComboboxOptions.displayName = 'ComboboxOptions'
export default ComboboxOptions
