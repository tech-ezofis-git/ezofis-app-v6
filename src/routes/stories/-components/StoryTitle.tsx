interface Props {
  children: React.ReactNode
}

const StoryTitle: React.FC<Props> = ({ children }) => {
  return (
    <h2 className='mb-10 font-poppins text-xl font-semibold text-gray-700'>
      {children}
    </h2>
  )
}

export default StoryTitle
