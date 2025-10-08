import type { InputWrapperOrder } from './types'

export const classNames = {
  description: 'mt-2 text-sm text-gray-10',
  error: 'mt-2 text-sm text-red-11',
  input:
    'border-gray-6 bg-transparent text-sm font-medium text-gray-12 placeholder:font-normal placeholder:text-gray-8 focus-within:border-primary-8 focus-within:ring-2 focus-within:ring-primary-6 disabled:bg-gray-3 data-[disabled]:bg-gray-3 data-[error]:border-red-8 data-[error]:ring-red-5',
  label: 'mb-2 text-sm font-medium text-gray-11',
  required: 'text-red-11',
  wrapper: 'm-0',
} as const

export const inputWrapperOrder: InputWrapperOrder[] = [
  'label',
  'input',
  'description',
  'error',
] as const

export const OptionsPerLineClass = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
  7: 'grid-cols-7',
  8: 'grid-cols-8',
  9: 'grid-cols-9',
  10: 'grid-cols-10',
  11: 'grid-cols-11',
  12: 'grid-cols-12',
} as const
