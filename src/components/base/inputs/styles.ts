const classNames = {
  description: 'mt-2 text-sx text-gray-500',
  error: 'mt-2 text-sx text-red',
  input:
    'border-gray-600/25 bg-transparent text-sm font-medium text-gray-900 placeholder:font-normal placeholder:text-gray-400 focus-within:border-primary disabled:bg-gray-600/10 disabled:opacity-50 data-[disabled]:bg-gray-600/10 data-[disabled]:opacity-50 data-[error]:border-red',
  label: 'mb-2 text-sm leading-6 font-medium text-gray-700',
  required: 'text-red',
  wrapper: 'm-0',
}

type InputWrapperOrder = 'input' | 'label' | 'description' | 'error'
const inputWrapperOrder: Array<InputWrapperOrder> = [
  'label',
  'input',
  'description',
  'error',
]

export { classNames, inputWrapperOrder }
