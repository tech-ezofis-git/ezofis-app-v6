import { TextInput as Base } from '@mantine/core'
import { type ChangeEvent, forwardRef, type ReactNode } from 'react'
import type { InputProps } from './shared/types'
import ClearButton from './ClearButton'
import InputLabel from './InputLabel'
import { classNames, inputWrapperOrder } from './shared/constants'
import cn from '@/utils/cn'

interface Props extends InputProps {
  value: string
  leftSection?: ReactNode
  leftSectionPointerEvents?: 'auto' | 'none'
  rightSection?: ReactNode
  rightSectionPointerEvents?: 'auto' | 'none'
  onBlur?: () => void
  onChange: (value: string) => void
  onKeyDown?: (e: any) => void
  type?: string
}

const InputText = forwardRef<HTMLInputElement, Props>(
  (
    {
      clearable,
      description,
      label,
      optional,
      required,
      rightSection,
      rightSectionPointerEvents = 'none',
      tooltip,
      tooltipWidth,
      value,
      onChange,
      type = "text",
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

    const handleChange = (e: ChangeEvent<HTMLInputElement>) =>
      onChange(e.currentTarget.value)

    return (
      <Base
        {...rest}
        description={rest.error ? undefined : description}
        inputWrapperOrder={inputWrapperOrder}
        label={_label}
        type={type}
        ref={ref}
        rightSection={_rightSection}
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
      />
    )
  },
)

InputText.displayName = 'InputText'
export default InputText