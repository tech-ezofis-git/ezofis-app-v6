import { Radio as Base } from '@mantine/core'

interface Props {
  checked?: boolean
  disabled?: boolean
}

const InputRadioIndicator = ({ checked, disabled }: Props) => {
  return (
    <div className='flex size-5 items-center justify-center'>
      <Base.Indicator
        checked={checked}
        className='group size-4.5 min-h-4.5 min-w-4.5 border-slate-200 bg-transparent data-checked:border-primary-9 data-checked:bg-primary-9 shadow-sm'
        disabled={disabled}
        classNames={{
          icon: 'size-1.5 text-transparent group-data-checked:text-white',
        }}
      />
    </div>
  )
}

InputRadioIndicator.displayName = 'InputRadioIndicator'
export default InputRadioIndicator
