interface Props {
  children: React.ReactNode
}

const StorySubTitle: React.FC<Props> = ({ children }) => {
  return (
    <h3 className='mb-6 text-base font-medium text-gray-500'>{children}</h3>
  )
}

export default StorySubTitle
