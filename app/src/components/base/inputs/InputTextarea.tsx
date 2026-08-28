import { Textarea as Base } from '@mantine/core'
import {
  type ChangeEvent,
  forwardRef,
  type KeyboardEvent,
  useState,
} from 'react'
import cn from '@/utils/cn'
import type { InputProps } from './shared/types'
import InputLabel from './InputLabel'
import { classNames, inputWrapperOrder } from './shared/constants'

interface Props extends InputProps {
  value: string
  autosize?: boolean
  maxLength?: number
  maxRows?: number
  minRows?: number
  resize?: 'none' | 'vertical' | 'both'
  rows?: number
  onChange: (value: string) => void
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void
}

const _classNames = {
  description: classNames.description,
  error: classNames.error,
  input: cn(classNames.input, 'h-auto min-h-auto py-1'),
  label: classNames.label,
  wrapper: classNames.wrapper,
}

const InputTextarea = forwardRef<HTMLTextAreaElement, Props>(
  (
    {
      autosize,
      description,
      label,
      maxLength,
      maxRows,
      minRows = 3,
      optional,
      required,
      resize,
      rows = 3,
      tooltip,
      tooltipWidth,
      value,
      onChange,
      ...rest
    },
    ref,
  ) => {
    const [length, setLength] = useState(0)

    const _label = label ? (
      <InputLabel
        label={label}
        optional={optional}
        required={required}
        tooltip={tooltip}
        tooltipWidth={tooltipWidth}
      />
    ) : undefined

    const getDescription = () => {
      if (rest.error) {
        return undefined
      }

      if (maxLength) {
        return `${length}/${maxLength}`
      }
      return description
    }

    const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.currentTarget.value)

      if (maxLength) {
        setLength(e.currentTarget.value.length)
      }
    }

    return (
      <Base
        {...rest}
        autosize={autosize}
        classNames={_classNames}
        description={getDescription()}
        inputWrapperOrder={inputWrapperOrder}
        label={_label}
        maxRows={maxRows}
        minRows={minRows}
        ref={ref}
        resize={resize}
        rows={rows}
        value={value}
        onChange={handleChange}
      />
    )
  },
)

InputTextarea.displayName = 'InputTextarea'
export default InputTextarea
