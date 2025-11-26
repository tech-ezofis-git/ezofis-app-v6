interface Props {
  title: string
}

const Title = ({ title }: Props) => {
  return (
    <h2 className='m-0 font-poppins text-21 font-semibold text-gray-13'>
      {title}
    </h2>
  )
}

Title.displayName = 'Title'
export default Title
