interface Props {
  title: string
  description?: string
}

const SectionTitle = ({ description, title }: Props) => {
  return (
    <div>
      <h3 className='text-15 font-semibold text-gray-13'>{title}</h3>
      {description && (
        <div className='mt-1 text-13/6 text-gray-10'>{description}</div>
      )}
    </div>
  )
}

SectionTitle.displayName = 'SectionTitle'
export default SectionTitle
