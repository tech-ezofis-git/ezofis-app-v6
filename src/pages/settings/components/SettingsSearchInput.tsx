import { useDebouncedCallback } from '@mantine/hooks'
import { useClickOutside } from '@mantine/hooks'
import { useEffect, useRef, useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import Tooltip from '@/components/base/Tooltip'
import cn from '@/utils/cn'

type SettingsSearchInputProps = {
  placeholder?: string
  value: string
  onChange: (value: string) => void
}

export default function SettingsSearchInput({
  placeholder = 'Search',
  value,
  onChange,
}: SettingsSearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [focused, setFocused] = useState(false)
  const [inputValue, setInputValue] = useState(value)
  const ref = useClickOutside(() => setFocused(false))

  useEffect(() => {
    setInputValue(value)
  }, [value])

  const handleValueChange = useDebouncedCallback((nextValue: string) => {
    onChange(nextValue)
  }, 300)

  const isExpanded = focused || !!value

  const handleContainerClick = () => {
    setFocused(true)
    requestAnimationFrame(() => {
      inputRef.current?.focus()
    })
  }

  const containerClasses = cn(
    'flex h-8 items-center rounded border outline-primary-8 transition-all duration-300 select-none focus-visible:outline-2',
    isExpanded
      ? 'focus-within:border-primary w-72 justify-start border-gray-6 bg-surface pr-3 pl-3'
      : 'w-8 cursor-pointer justify-center border-gray-6 bg-surface text-gray-11 hover:bg-gray-4 hover:text-gray-12 active:scale-95',
  )

  const searchContent = (
    <div
      aria-label='Search'
      className={containerClasses}
      ref={ref}
      role='search'
      onClick={handleContainerClick}
    >
      <Icon
        name='lucide:search'
        className={cn(
          'size-4 shrink-0 transition-colors',
          isExpanded ? 'text-gray-11' : 'text-gray-11 hover:text-gray-12',
        )}
      />

      <div
        className={cn(
          'h-full transition-[width] duration-300',
          isExpanded ? 'w-full flex-1' : 'w-0 flex-none overflow-hidden',
        )}
      >
        <input
          ref={inputRef}
          placeholder={placeholder}
          type='text'
          value={inputValue}
          className={cn(
            'h-full w-full border-0 bg-transparent px-2 text-13 font-medium text-gray-12 outline-0 placeholder:text-gray-11',
            isExpanded ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
          onChange={(event) => {
            setInputValue(event.target.value)
            handleValueChange(event.target.value)
          }}
          onFocus={() => setFocused(true)}
        />
      </div>
    </div>
  )

  if (!isExpanded) {
    return (
      <Tooltip content='Search' position='top'>
        {searchContent}
      </Tooltip>
    )
  }

  return searchContent
}
