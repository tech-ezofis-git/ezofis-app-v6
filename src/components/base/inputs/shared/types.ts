import type { Option } from '@/types/option'
import type { OptionsPerLineClass } from './constants'

export interface InputProps {
  className?: string
  clearable?: boolean
  description?: string
  disabled?: boolean
  error?: string
  label?: string
  optional?: boolean
  placeholder?: string
  readOnly?: boolean
  required?: boolean
  tooltip?: string
  tooltipWidth?: number
}

export type InputWrapperOrder = 'input' | 'label' | 'description' | 'error'

export type OptionsPerLine = keyof typeof OptionsPerLineClass

export interface SelectionGroupProps
  extends Omit<InputProps, 'placeholder' | 'readOnly'> {
  options: Option[]
  optionsPerLine?: OptionsPerLine
}

export interface SelectionProps {
  checked?: boolean
  className?: string
  description?: string
  disabled?: boolean
  error?: string
  label?: string
  value?: string
  onChange?: (value: boolean) => void
}

export interface SelectProps extends InputProps {
  options: Option[]
  creatable?: boolean
  searchable?: boolean
  searchPlaceholder?: string
}

export type SelectVariant = 'single' | 'multiple'
