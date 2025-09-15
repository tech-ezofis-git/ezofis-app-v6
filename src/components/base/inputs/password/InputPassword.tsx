import { PasswordInput as Base } from '@mantine/core'
import { type ChangeEvent, forwardRef, type ReactNode } from 'react'
import type { InputProps } from '../shared/types'
import InputLabel from '../InputLabel'
import { classNames, inputWrapperOrder } from '../shared/constants'
import VisibilityToggleIcon from './VisibilityToggleIcon'

interface Props
  extends Omit<InputProps, 'clearable' | 'placeholder' | 'readOnly'> {
  value: string
  leftSection?: ReactNode
  showPlaceholder?: boolean
  onChange: (value: string) => void
}

const _classNames = {
  description: classNames.description,
  error: classNames.error,
  innerInput: 'placeholder:font-normal placeholder:text-gray-8',
  input: classNames.input,
  label: classNames.label,
  visibilityToggle: 'hover:bg-gray-4 group size-7',
  wrapper: classNames.wrapper,
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

    const handleChange = (e: ChangeEvent<HTMLInputElement>) =>
      onChange(e.currentTarget.value)

    return (
      <Base
        {...rest}
        classNames={_classNames}
        description={rest.error ? undefined : description}
        inputWrapperOrder={inputWrapperOrder}
        label={_label}
        placeholder={showPlaceholder ? '••••••••••' : undefined}
        ref={ref}
        value={value}
        visibilityToggleIcon={VisibilityToggleIcon}
        onChange={handleChange}
      />
    )
  },
)

InputPassword.displayName = 'InputPassword'
export default InputPassword
