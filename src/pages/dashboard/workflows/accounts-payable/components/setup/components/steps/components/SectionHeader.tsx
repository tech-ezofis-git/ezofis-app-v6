interface Props {
  description: string
  title: string
}

const SectionHeader = ({ description, title }: Props) => {
  return (
    <div className='mb-6'>
      <h3 className='mb-1 text-medium font-medium text-gray-12'>{title}</h3>
      <div className='text-small/6 text-gray-10'>{description}</div>
    </div>
  )
}

SectionHeader.displayName = 'SectionHeader'
export default SectionHeader
