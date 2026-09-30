import { PasswordInput as Base } from '@mantine/core'
import {
  type ChangeEvent,
  type ClipboardEvent,
  type FormEvent,
  forwardRef,
  type ReactNode,
} from 'react'
import type { InputProps } from '../shared/types'
import InputLabel from '../InputLabel'
import { classNames, inputWrapperOrder } from '../shared/constants'
import VisibilityToggleIcon from './VisibilityToggleIcon'

interface Props extends Omit<
  InputProps,
  'clearable' | 'placeholder' | 'readOnly'
> {
  value: string
  autoComplete?: string
  leftSection?: ReactNode
  showPlaceholder?: boolean
  onBlur?: () => void
  onChange: (value: string) => void
  onInput?: (e: FormEvent<HTMLInputElement>) => void
  onKeyDown?: (e: any) => void
  onPaste?: (e: ClipboardEvent<HTMLInputElement>) => void
}

const InputPassword = forwardRef<HTMLInputElement, Props>(
  (
    {
      description,
      label,
      optional,
      required,
      showPlaceholder,
      tooltip,
      tooltipWidth,
      value,
      onChange,
      onInput,
      onPaste,
      ...rest
    },
    ref,
  ) => {
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
        placeholder={showPlaceholder ? '••••••••••' : undefined}
        ref={ref}
        value={value}
        visibilityToggleIcon={VisibilityToggleIcon}
        classNames={{
          description: classNames.description,
          error: classNames.error,
          innerInput: 'placeholder:font-normal placeholder:text-gray-8',
          input: classNames.input,
          label: classNames.label,
          visibilityToggle: 'group size-7 hover:bg-gray-4',
          wrapper: classNames.wrapper,
        }}
        onChange={handleChange}
        onInput={handleInput}
        onPaste={handlePaste}
      />
    )
  },
)

InputPassword.displayName = 'InputPassword'
export default InputPassword
