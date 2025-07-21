import { PasswordInput as Primitive } from '@mantine/core'
import React, { type ChangeEvent } from 'react'
import { InputLabel } from '@/components/base'
import { classNames, inputWrapperOrder } from '../styles'
import VisibilityToggleIcon from './VisibilityToggleIcon'

interface Props {
  className?: string
  description?: string
  error?: string
  isDisabled?: boolean
  isOptional?: boolean
  isRequired?: boolean
  label?: string
  leftSection?: React.ReactNode
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
      error,
      isDisabled,
      isOptional,
      isRequired,
      label,
      leftSection,
      onChange,
      tooltip,
      tooltipWidth,
      value,
    },
    ref,
  ) => {
    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      if (onChange) {
        onChange(e.currentTarget.value)
      }
    }

    return (
      <Primitive
        className={className}
        description={error ? undefined : description}
        disabled={isDisabled}
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
              isOptional={isOptional}
              isRequired={isRequired}
              label={label}
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
