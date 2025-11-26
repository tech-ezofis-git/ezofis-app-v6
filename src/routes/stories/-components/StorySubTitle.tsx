import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

const StorySubTitle = ({ children }: Props) => {
  return (
    <h3 className='mb-8 border-b border-gray-3 pb-2 text-15 font-medium text-gray-11'>
      # {children}
    </h3>
  )
}

export default StorySubTitle
