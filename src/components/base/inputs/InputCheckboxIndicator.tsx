import { Checkbox as Base } from '@mantine/core'

interface Props {
  checked?: boolean
  disabled?: boolean
  indeterminate?: boolean
}

const InputCheckboxIndicator = ({
  checked,
  disabled,
  indeterminate,
}: Props) => {
  return (
    <div className='flex size-5 items-center justify-center'>
      <Base.Indicator
        checked={checked}
        className='group size-4.5 min-h-4.5 min-w-4.5 border-gray-8 bg-transparent data-checked:border-primary-9 data-checked:bg-primary-9'
        disabled={disabled}
        indeterminate={indeterminate}
        classNames={{
          icon: 'w-[65%] text-transparent group-data-checked:text-white',
        }}
      />
    </div>
  )
}

InputCheckboxIndicator.displayName = 'InputCheckboxIndicator'
export default InputCheckboxIndicator
