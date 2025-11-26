import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

const StoryTitle = ({ children }: Props) => {
  return (
    <h2 className='mb-10 font-poppins text-18 font-semibold text-gray-12'>
      {children}
    </h2>
  )
}

export default StoryTitle
