import { t as staticT } from '@lingui/macro'
import { useLingui } from '@lingui/react/macro'
import { useEffect, useRef, useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import Tooltip from '@/components/base/Tooltip'
import cn from '@/utils/cn'

const FIELD_KIND_ICONS = {
  predefined: {
    className: 'text-gray-10',
    icon: 'tabler:template',
    label: staticT`Master field`,
  },
} as const

const OPTION_ITEM_CLASS =
  'group flex h-8 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-left text-13 font-normal transition-colors focus-visible:outline-0'
const OPTION_ITEM_IDLE_CLASS =
  'text-gray-12 hover:bg-gray-2 hover:text-gray-13 focus-visible:bg-gray-2'
const OPTION_ITEM_SELECTED_CLASS = 'bg-primary-2 text-primary-9'
const OPTION_LABEL_CLASS = 'truncate transition-colors'
const MENU_LABEL_CLASS =
  'mb-0.5 flex h-8 w-full items-center gap-1.5 rounded-md px-2 text-13 font-semibold text-gray-12 transition-colors'

interface MasterFieldSelectDropdownProps {
  options: { id: string; label: string }[]
  value: string | null
  placeholder?: string
  onChange: (value: string | null) => void
}

export default function MasterFieldSelectDropdown({
  options,
  placeholder,
  value,
  onChange,
}: MasterFieldSelectDropdownProps) {
  const { t } = useLingui()
  const displayPlaceholder = placeholder ?? t`Select matching field...`
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [openUpward, setOpenUpward] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find((opt) => opt.id === value)
  const mappedEzField = selectedOption ? selectedOption.label : null
  const hasMapping = !!mappedEzField

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className='relative min-w-0'>
      <div
        className='flex h-8 w-full cursor-pointer items-center justify-between rounded-lg border border-gray-3 bg-surface px-3 font-normal transition-all duration-200 select-none hover:border-gray-4'
        ref={triggerRef}
        onClick={(e) => {
          e.stopPropagation()
          if (!isOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect()
            const spaceBelow = window.innerHeight - rect.bottom
            setOpenUpward(spaceBelow < 320)
          }
          setIsOpen(!isOpen)
          setSearchQuery('')
        }}
      >
        <div className='flex min-w-0 items-center gap-2'>
          {hasMapping ? (
            <>
              <Tooltip
                content={FIELD_KIND_ICONS.predefined.label}
                position='top'
              >
                <span
                  className='inline-flex shrink-0'
                  onClick={(e) => e.stopPropagation()}
                >
                  <Icon
                    name='lucide:type'
                    className={cn(
                      'size-3.5',
                      FIELD_KIND_ICONS.predefined.className,
                    )}
                  />
                </span>
              </Tooltip>
              <span className='truncate font-normal'>{mappedEzField}</span>
            </>
          ) : (
            <span className='truncate font-normal text-gray-9'>
              {displayPlaceholder}
            </span>
          )}
        </div>

        <div className='flex shrink-0 items-center gap-1.5'>
          <Icon
            name='tabler:chevron-down'
            className={cn(
              'size-3.5 shrink-0 transition-transform duration-200',
              isOpen && 'rotate-180',
            )}
          />
        </div>
      </div>

      {isOpen && (
        <div
          ref={dropdownRef}
          className={cn(
            'absolute right-0 left-0 z-40 min-w-[240px] rounded-lg border border-gray-3 bg-surface-raised p-1 pt-2 shadow-md',
            openUpward ? 'bottom-10' : 'top-10',
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className='mb-2 px-1'>
            <div className='relative flex items-center'>
              <Icon
                className='absolute left-2 size-3.5 text-gray-9'
                name='tabler:search'
              />
              <input
                className='h-8 w-full rounded-md border border-gray-3 bg-surface pr-2 pl-7 text-13 font-normal text-gray-12 outline-0 transition-colors placeholder:text-gray-8 focus:border-primary-7'
                placeholder={t`Search or enter custom name`}
                type='text'
                value={searchQuery}
                autoFocus
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className='custom-scrollbar max-h-64 overflow-y-auto pb-1'>
            <div className={MENU_LABEL_CLASS}>
              <Icon
                name={FIELD_KIND_ICONS.predefined.icon}
                className={cn(
                  'size-3.5 shrink-0',
                  FIELD_KIND_ICONS.predefined.className,
                )}
              />
              <span className='min-w-0 flex-1 truncate text-left'>
                {t`Master Fields`}
                <span className='ml-1 font-normal text-gray-9'>
                  ({filteredOptions.length})
                </span>
              </span>
            </div>

            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = opt.id === value
                return (
                  <button
                    key={opt.id}
                    type='button'
                    className={cn(
                      OPTION_ITEM_CLASS,
                      isSelected
                        ? OPTION_ITEM_SELECTED_CLASS
                        : OPTION_ITEM_IDLE_CLASS,
                    )}
                    onClick={() => {
                      onChange(opt.id)
                      setIsOpen(false)
                    }}
                  >
                    <CompactRadioIndicator checked={isSelected} />
                    <span className={OPTION_LABEL_CLASS}>{opt.label}</span>
                  </button>
                )
              })
            ) : (
              <div className='flex h-8 items-center px-2 text-13 font-normal text-gray-10 select-none'>
                {t`No matching master fields`}
              </div>
            )}
          </div>

          <div className='mt-1 border-t border-gray-3 pt-1'>
            <button
              type='button'
              className={cn(
                OPTION_ITEM_CLASS,
                'text-red-9 hover:bg-red-2 hover:text-red-10',
              )}
              onClick={() => {
                onChange(null)
                setIsOpen(false)
              }}
            >
              <Icon className='size-3.5 shrink-0' name='tabler:circle-off' />
              <span
                className={OPTION_LABEL_CLASS}
              >{t`Skip this field (unmap)`}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function CompactRadioIndicator({ checked }: { checked?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex size-3.5 shrink-0 items-center justify-center rounded-full border transition-colors',
        checked
          ? 'border-primary-9 bg-primary-9'
          : 'border-gray-5 bg-transparent',
      )}
    >
      {checked ? <span className='size-1 rounded-full bg-white' /> : null}
    </span>
  )
}
