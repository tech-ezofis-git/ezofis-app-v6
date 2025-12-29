import { TextInput as Base } from '@mantine/core'
import { type ChangeEvent, forwardRef, type ReactNode } from 'react'
import cn from '@/utils/cn'
import type { InputProps } from './shared/types'
import ClearButton from './ClearButton'
import InputLabel from './InputLabel'
import {
  classNames,
  inputWrapperOrder,
  sizeClassName,
} from './shared/constants'

interface Props extends InputProps {
  value: string
  leftSection?: ReactNode
  leftSectionPointerEvents?: 'auto' | 'none'
  rightSection?: ReactNode
  rightSectionPointerEvents?: 'auto' | 'none'
  onChange: (value: string) => void
  onKeyDown?: (e: any) => void
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
      size = 'md',
      tooltip,
      tooltipWidth,
      value,
      onChange,
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
        ref={ref}
        rightSection={_rightSection}
        value={value}
        classNames={{
          description: classNames.description,
          error: classNames.error,
          input: cn(classNames.input, sizeClassName[size]),
          label: classNames.label,
          wrapper: classNames.wrapper,
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