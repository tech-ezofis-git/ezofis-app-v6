interface Props {
  description: string
  title: string
  action?: React.ReactNode
}

const SectionHeader = ({ action, description, title }: Props) => {
  return (
    <div className='mb-4 flex items-start justify-between gap-4'>
      <div className='min-w-0 flex-1 space-y-1'>
        <h3 className='text-14/5 font-semibold text-gray-12'>{title}</h3>
        <p className='text-13/5.5 text-pretty text-gray-10'>{description}</p>
      </div>
      {action && <div className='shrink-0'>{action}</div>}
    </div>
  )
}

SectionHeader.displayName = 'SectionHeader'
export default SectionHeader
