import { TextInput as Base } from '@mantine/core'
import {
  type ChangeEvent,
  type ClipboardEvent,
  type FormEvent,
  forwardRef,
  type ReactNode,
} from 'react'
import cn from '@/utils/cn'
import type { InputProps } from './shared/types'
import ClearButton from './ClearButton'
import InputLabel from './InputLabel'
import { classNames, inputWrapperOrder } from './shared/constants'

interface Props extends InputProps {
  value: string
  autoComplete?: string
  autoFocus?: boolean
  leftSection?: ReactNode
  leftSectionPointerEvents?: 'auto' | 'none'
  leftSectionWidth?: number | string
  rightSection?: ReactNode
  rightSectionPointerEvents?: 'auto' | 'none'
  rightSectionWidth?: number | string
  type?: string
  onBlur?: () => void
  onChange: (value: string) => void
  onInput?: (e: FormEvent<HTMLInputElement>) => void
  onKeyDown?: (e: any) => void
  onPaste?: (e: ClipboardEvent<HTMLInputElement>) => void
}

const InputText = forwardRef<HTMLInputElement, Props>(
  (
    {
      clearable,
      description,
      label,
      leftSectionWidth,
      optional,
      required,
      rightSection,
      rightSectionPointerEvents = 'none',
      rightSectionWidth,
      tooltip,
      tooltipWidth,
      type = 'text',
      value,
      onChange,
      onInput,
      onPaste,
      ...rest
    },
    ref,
  ) => {
    const _clearable = clearable && value
    const _rightSection = _clearable ? (
      <ClearButton onClick={() => onChange('')} />
    ) : (
      rightSection
    )

    const _label = label ? (
      <InputLabel
        label={label}
        optional={optional}
        required={required}
        tooltip={tooltip}
        tooltipWidth={tooltipWidth}
      />
    ) : undefined

    const readValue = (target: EventTarget | null) =>
      target && 'value' in target
        ? String((target as HTMLInputElement).value)
        : ''

    const handleChange = (e: ChangeEvent<HTMLInputElement>) =>
      onChange(e.currentTarget.value || e.target.value)

    const handleInput = (e: FormEvent<HTMLInputElement>) => {
      onInput?.(e)
      onChange(readValue(e.target) || e.currentTarget.value)
    }

    const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
      onPaste?.(e)
      if (e.defaultPrevented) return
      const pasted = e.clipboardData?.getData('text') ?? ''
      if (!pasted) return
      const input = e.target as HTMLInputElement
      const start = input.selectionStart ?? value.length
      const end = input.selectionEnd ?? value.length
      e.preventDefault()
      onChange(`${value.slice(0, start)}${pasted}${value.slice(end)}`)
    }

    return (
      <Base
        {...rest}
        description={rest.error ? undefined : description}
        inputWrapperOrder={inputWrapperOrder}
        label={_label}
        leftSectionWidth={leftSectionWidth}
        ref={ref}
        rightSection={_rightSection}
        rightSectionWidth={rightSectionWidth}
        type={type}
        value={value}
        classNames={{
          description: cn(classNames.description, rest.classNames?.description),
          error: cn(classNames.error, rest.classNames?.error),
          input: cn(classNames.input, rest.classNames?.input),
          label: cn(classNames.label, rest.classNames?.label),
          wrapper: cn(classNames.wrapper, rest.classNames?.wrapper),
        }}
        rightSectionPointerEvents={
          _clearable ? 'auto' : rightSectionPointerEvents
        }
        onChange={handleChange}
        onInput={handleInput}
        onPaste={handlePaste}
      />
    )
  },
)

InputText.displayName = 'InputText'
export default InputText
