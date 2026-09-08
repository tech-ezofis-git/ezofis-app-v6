import { Combobox as Base, Input, InputBase } from '@mantine/core'
import { forwardRef, type ReactNode, useMemo } from 'react'
import type { Option } from '@/types/option'
import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'
import type { InputProps, SelectVariant } from '../shared/types'
import ClearButton from '../ClearButton'
import InputLabel from '../InputLabel'
import { classNames, inputWrapperOrder } from '../shared/constants'

interface Props extends InputProps {
  value: Option[]
  iconOnly?: boolean
  leftSection?: ReactNode
  loading?: boolean
  rightSectionIcon?: string
  variant?: SelectVariant
  onChange: (value: Option[]) => void
  onClick: () => void
}

const ComboboxTarget = forwardRef<HTMLButtonElement, Props>(
  (
    {
      clearable,
      description,
      iconOnly,
      label,
      loading,
      optional,
      placeholder,
      readOnly,
      required,
      rightSectionIcon,
      tooltip,
      tooltipWidth,
      value,
      variant = 'single',
      onChange,
      onClick,
      ...rest
    },
    ref,
  ) => {
    const locked = Boolean(rest.disabled || readOnly)
    const list = value ?? []
    const firstValue = list[0] || null

    const selectedIconKey = (firstValue as (Option & { iconKey?: string }) | null)
      ?.iconKey
    const selectedRightIconKey = (
      firstValue as (Option & { rightIconKey?: string }) | null
    )?.rightIconKey

    const trailingTypeIcon =
      selectedRightIconKey?.includes(':') || selectedIconKey?.includes(':')
        ? selectedRightIconKey || selectedIconKey
        : undefined

    const _classNames = {
      description: classNames.description,
      error: classNames.error,
      input: cn(
        classNames.input,
        'select-none',
        variant === 'multiple' &&
          'flex !h-auto min-h-9 overflow-visible whitespace-normal',
        variant === 'multiple' &&
          (list.length > 0 ? 'items-start py-1' : 'items-center'),
        locked
          ? 'cursor-not-allowed bg-gray-3 text-gray-10 [&_*]:cursor-not-allowed'
          : 'cursor-pointer focus:cursor-pointer focus-visible:cursor-pointer [&_*]:cursor-pointer',
      ),
      label: classNames.label,
      wrapper: cn(
        classNames.wrapper,
        locked ? 'cursor-not-allowed' : 'cursor-pointer',
      ),
    }

    const _label = label ? (
      <InputLabel
        label={label}
        optional={optional}
        required={required}
        tooltip={tooltip}
        tooltipWidth={tooltipWidth}
      />
    ) : undefined

    const chevron = (
      <Icon
        className='text-gray-10'
        name={rightSectionIcon || 'lucide:chevron-down'}
      />
    )

    let _rightSection: ReactNode = trailingTypeIcon ? (
      <span className='flex items-center gap-1.5'>
        <Icon
          className='size-4 shrink-0 text-primary-9'
          name={trailingTypeIcon}
        />
        {chevron}
      </span>
    ) : (
      chevron
    )
    if (loading) {
      _rightSection = (
        <Icon className='animate-spin text-gray-10' name='fa:spinner' />
      )
    } else if (clearable && list.length && !locked) {
      _rightSection = (
        <span className='flex items-center gap-1.5'>
          {trailingTypeIcon ? (
            <Icon
              className='size-4 shrink-0 text-primary-9'
              name={trailingTypeIcon}
            />
          ) : null}
          <ClearButton onClick={() => onChange([])} />
        </span>
      )
    }

    const children = useMemo(() => {
      if (!list.length) {
        return (
          <Input.Placeholder className='flex items-center font-normal leading-none text-gray-8'>
            {placeholder || 'Select'}
          </Input.Placeholder>
        )
      }

      if (variant === 'single') {
        if (iconOnly) {
          return firstValue ? (
            <span className='sr-only'>{firstValue.name}</span>
          ) : (
            <Input.Placeholder className='font-normal text-gray-8'>
              {placeholder || 'Select'}
            </Input.Placeholder>
          )
        }

        // Prefer rightIconKey in the chevron cluster; only show leading iconKey when
        // it is distinct from the trailing type icon.
        const showLeadingIcon =
          Boolean(selectedIconKey?.includes(':')) &&
          selectedIconKey !== trailingTypeIcon

        return (
          <div className='flex min-w-0 items-center gap-2'>
            {showLeadingIcon ? (
              <Icon className='size-4 shrink-0' name={selectedIconKey!} />
            ) : null}
            <div className='truncate text-13 font-normal text-gray-12'>
              {firstValue?.name}
            </div>
          </div>
        )
      }

      return (
        <div className='flex min-w-0 flex-wrap items-center gap-1'>
          {list.map((opt, index) => (
            <div
              className='inline-flex max-w-full items-center gap-0.5 rounded bg-gray-4 py-0.5 pr-0.5 pl-2 text-13 font-normal text-gray-12'
              key={`${opt.id}-${opt.name}-${index}`}
            >
              <span className='truncate'>{opt.name}</span>
              {!locked && (
                <button
                  aria-label={`Remove ${opt.name}`}
                  className='flex size-5 shrink-0 items-center justify-center rounded text-gray-8 transition-all hover:bg-gray-6 hover:text-gray-13 active:scale-90'
                  type='button'
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    onChange(list.filter((_, itemIndex) => itemIndex !== index))
                  }}
                  onMouseDown={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                  }}
                >
                  <Icon className='size-3' name='lucide:x' />
                </button>
              )}
            </div>
          ))}
        </div>
      )
    }, [
      firstValue,
      iconOnly,
      list,
      locked,
      onChange,
      placeholder,
      selectedIconKey,
      trailingTypeIcon,
      variant,
    ])

    return (
      <Base.Target>
        <InputBase
          {...rest}
          classNames={_classNames}
          component={(variant === 'multiple' ? 'div' : 'button') as any}
          description={rest.error ? undefined : description}
          disabled={locked}
          inputWrapperOrder={inputWrapperOrder}
          label={_label}
          pointer={!locked}
          ref={ref}
          rightSection={_rightSection}
          rightSectionPointerEvents={clearable && !locked ? 'auto' : 'none'}
          rightSectionWidth={
            trailingTypeIcon && !loading ? (clearable && list.length && !locked ? 68 : 52) : undefined
          }
          styles={{
            input: {
              cursor: locked ? 'not-allowed' : 'pointer',
              ...(variant === 'multiple'
                ? { height: 'auto', minHeight: '2.25rem' }
                : {}),
            },
            wrapper: {
              cursor: locked ? 'not-allowed' : 'pointer',
              ['--input-cursor' as string]: locked ? 'not-allowed' : 'pointer',
            },
          }}
          type={variant === 'multiple' ? undefined : 'button'}
          onClick={locked ? undefined : onClick}
        >
          {children}
        </InputBase>
      </Base.Target>
    )
  },
)

ComboboxTarget.displayName = 'ComboboxTarget'
export default ComboboxTarget
