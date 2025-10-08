interface Props {
  description: string
  title: string
}

const SectionHeader = ({ description, title }: Props) => {
  return (
    <div className='mb-8'>
      <h3 className='mb-2 text-base font-medium text-gray-12'>{title}</h3>
      <div className='text-gray-10'>{description}</div>
    </div>
  )
}

SectionHeader.displayName = 'SectionHeader'
export default SectionHeader
