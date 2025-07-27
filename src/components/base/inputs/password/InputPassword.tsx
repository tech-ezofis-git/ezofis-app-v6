import { PasswordInput as Base } from '@mantine/core'
import React, { type ChangeEvent } from 'react'
import { classNames, inputWrapperOrder } from '../constants'
import InputLabel from '../InputLabel'
import VisibilityToggleIcon from './VisibilityToggleIcon'

interface Props {
  className?: string
  description?: string
  disabled?: boolean
  error?: string
  label?: string
  leftSection?: React.ReactNode
  optional?: boolean
  required?: boolean
  tooltip?: string
  tooltipWidth?: number
  value?: string
  onChange?: (value: string) => void
}

const InputPassword = React.forwardRef<HTMLInputElement, Props>(
  (
    {
      className,
      description,
      disabled,
      error,
      label,
      leftSection,
      optional,
      required,
      tooltip,
      tooltipWidth,
      value,
      onChange,
    },
    ref,
  ) => {
    const handleChange = (e: ChangeEvent<HTMLInputElement>) =>
      onChange?.(e.currentTarget.value)

    return (
      <Base
        className={className}
        description={error ? undefined : description}
        disabled={disabled}
        error={error}
        inputWrapperOrder={inputWrapperOrder}
        leftSection={leftSection}
        ref={ref}
        value={value}
        visibilityToggleIcon={VisibilityToggleIcon}
        classNames={{
          description: classNames.description,
          error: classNames.error,
          input: classNames.input,
          label: classNames.label,
          visibilityToggle: 'hover:bg-gray-600/10',
          wrapper: classNames.wrapper,
        }}
        label={
          label ? (
            <InputLabel
              label={label}
              optional={optional}
              required={required}
              tooltip={tooltip}
              tooltipWidth={tooltipWidth}
            />
          ) : undefined
        }
        onChange={handleChange}
      />
    )
  },
)

InputPassword.displayName = 'InputPassword'
export default InputPassword
