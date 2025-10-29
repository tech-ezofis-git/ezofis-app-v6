import type { ReactNode } from 'react'
import { useViewportSize } from '@mantine/hooks'
import { SCREEN_XL } from '@/constants'
import cn from '@/utils/cn'

interface Props {
  children: ReactNode
  title: string
}

const Section = ({ children, title }: Props) => {
  const { width } = useViewportSize()

  return (
    <div
      className={cn('mb-8 px-6 md:px-8', width >= SCREEN_XL && '@container')}
    >
      <h2 className='m-0 mb-4 text-medium font-medium'>{title}</h2>
      {children}
    </div>
  )
}

Section.displayName = 'Section'
export default Section
