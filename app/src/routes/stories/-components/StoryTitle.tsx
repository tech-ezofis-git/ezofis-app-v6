import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

const StoryTitle = ({ children }: Props) => {
  return (
    <h2 className='mb-10 text-18 font-semibold text-gray-13'>{children}</h2>
  )
}

export default StoryTitle
