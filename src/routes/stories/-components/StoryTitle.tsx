interface Props {
  children: React.ReactNode
}

const StoryTitle: React.FC<Props> = ({ children }) => {
  return (
    <h2 className='mb-8 font-poppins text-xl font-semibold text-fc-2'>
      {children}
    </h2>
  )
}

export default StoryTitle
