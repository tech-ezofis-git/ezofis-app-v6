import { useLingui } from '@lingui/react/macro'
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
  placeholder,
  value,
  onChange,
}: SettingsSearchInputProps) {
  const { t } = useLingui()
  const defaultPlaceholder = placeholder || t`Search`
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
    'flex h-8 items-center overflow-hidden rounded border outline-primary-8 transition-all duration-300 select-none focus-visible:outline-2',
    isExpanded
      ? 'items-stretch focus-within:border-primary w-72 justify-start border-gray-6 bg-surface pr-3'
      : 'w-8 cursor-pointer items-center justify-center border-gray-6 bg-surface text-gray-11 hover:bg-gray-4 hover:text-gray-12 active:scale-95',
  )

  const searchContent = (
    <div
      aria-label={t`Search`}
      className={containerClasses}
      ref={ref}
      role='search'
      onClick={handleContainerClick}
    >
      <span
        className={cn(
          'flex h-full shrink-0 items-center justify-center',
          isExpanded ? 'h-8 w-7 bg-primary-4' : '',
        )}
      >
        <Icon
          className={cn(
            'size-4 shrink-0',
            isExpanded ? 'text-primary-11' : 'text-gray-11',
          )}
          name='lucide:search'
        />
      </span>

      <div
        className={cn(
          'h-full transition-[width] duration-300',
          isExpanded ? 'w-full flex-1' : 'w-0 flex-none overflow-hidden',
        )}
      >
        <input
          placeholder={defaultPlaceholder}
          ref={inputRef}
          type='text'
          value={inputValue}
          className={cn(
            'h-full w-full border-0 bg-transparent pr-2 pl-1 text-13 font-medium text-gray-12 outline-0 placeholder:text-gray-11',
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
      <Tooltip content={t`Search`} position='top'>
        {searchContent}
      </Tooltip>
    )
  }

  return searchContent
}
