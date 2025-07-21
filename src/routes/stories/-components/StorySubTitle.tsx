interface Props {
  children: React.ReactNode
}

const StorySubTitle: React.FC<Props> = ({ children }) => {
  return (
    <h3 className='mb-8 border-b border-gray-600/5 pb-2 text-base font-medium text-gray-600'>
      # {children}
    </h3>
  )
}

export default StorySubTitle
