import InputRadioCard from '@/components/base/inputs/InputRadioCard'

interface Props {
  checked: boolean
  logo: string
  name: string
  value: string
  onClick: () => void
}

const BrandCard = ({ checked, logo, name, value, onClick }: Props) => {
  return (
    <InputRadioCard
      checked={checked}
      className='flex flex-1 items-center gap-3 rounded border border-gray-5 p-4 text-center'
      value={value}
      onClick={onClick}
    >
      <img alt={name} className='size-7' src={logo} />
      <div className='text-13 font-medium text-gray-13'>{name}</div>
    </InputRadioCard>
  )
}

BrandCard.displayName = 'BrandCard'
export default BrandCard
