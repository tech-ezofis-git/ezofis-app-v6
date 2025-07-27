import type { InputWrapperOrder } from './types'

export const classNames = {
  description: 'mt-2 text-sx text-gray-500',
  error: 'mt-2 text-sx text-red',
  input:
    'border-gray-600/25 bg-transparent text-sm font-medium text-gray-900 placeholder:font-normal placeholder:text-gray-400 focus-within:border-primary disabled:bg-gray-600/10 disabled:opacity-50 data-[disabled]:bg-gray-600/10 data-[disabled]:opacity-50 data-[error]:border-red',
  label: 'mb-2 text-sm leading-6 font-medium text-gray-700',
  required: 'text-red',
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
