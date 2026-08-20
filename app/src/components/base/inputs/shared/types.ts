import type { ReactNode } from 'react'
import { type ComboboxProps } from '@mantine/core'
import type { Option } from '@/types/option'
import type { OptionsPerLineClass } from './constants'

export interface InputProps {
  className?: string
  classNames?: Partial<
    Record<'input' | 'label' | 'description' | 'error' | 'wrapper', string>
  >
  clearable?: boolean
  description?: string
  disabled?: boolean
  error?: string
  label?: string
  optional?: boolean
  placeholder?: string
  readOnly?: boolean
  required?: boolean
  styles?: any
  tooltip?: string
  tooltipWidth?: number
}

export type InputWrapperOrder = 'input' | 'label' | 'description' | 'error'

export type OptionsPerLine = keyof typeof OptionsPerLineClass

export interface SelectionGroupProps extends Omit<
  InputProps,
  'placeholder' | 'readOnly'
> {
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
  autoOpen?: boolean
  creatable?: boolean
  /** Label for the creatable option. Receives current search text. */
  createOptionLabel?: (search: string) => string
  /** When set, creatable row only shows if this returns true for current search. */
  isCreatableSearch?: (search: string) => boolean
  dropdownFooter?: ReactNode
  iconOnly?: boolean
  leftSection?: ReactNode
  loading?: boolean
  position?: ComboboxProps['position']
  rightSectionIcon?: string
  searchable?: boolean
  searchPlaceholder?: string
  width?: ComboboxProps['width']
  onDropdownClose?: () => void
  onDropdownOpen?: () => void
}

export type SelectVariant = 'single' | 'multiple'
