interface Props {
  description: string
  title: string
}

const AuthTitle = ({ description, title }: Props) => {
  return (
    <div className='flex w-full flex-col items-center gap-1 text-center'>
      <h1 className='font-poppins text-2xl font-semibold text-gray-13'>
        {title}
      </h1>
      <p className='text-sm leading-6 text-pretty text-gray-11'>
        {description}
      </p>
    </div>
  )
}

AuthTitle.displayName = 'AuthTitle'
export default AuthTitle
