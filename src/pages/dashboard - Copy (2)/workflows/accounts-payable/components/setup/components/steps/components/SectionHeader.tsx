interface Props {
  description: string
  title: string
  action?: React.ReactNode
}

const SectionHeader = ({ action, description, title }: Props) => {
  return (
    <div className='mb-6 flex items-start justify-between gap-4'>
      <div className='min-w-0 flex-1'>
        <h3 className='mb-1 text-15 font-medium text-gray-12'>{title}</h3>
        <div className='text-13/6 text-gray-10'>{description}</div>
      </div>
      {action && <div className='shrink-0'>{action}</div>}
    </div>
  )
}

SectionHeader.displayName = 'SectionHeader'
export default SectionHeader
