interface Props {
  children: React.ReactNode
}

const StorySubTitle: React.FC<Props> = ({ children }) => {
  return <h3 className='mb-6 text-base font-medium text-fc-3'>{children}</h3>
}

export default StorySubTitle
