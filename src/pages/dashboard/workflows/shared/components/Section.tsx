import type { ReactNode } from 'react'
import { useViewportSize } from '@mantine/hooks'
import Title from '@/components/base/Title'
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
      className={cn(
        'mb-8 px-6 xl:mb-10 xl:px-8',
        width >= SCREEN_XL && '@container',
      )}
    >
      <Title className='mb-4' title={title} />
      {children}
    </div>
  )
}

Section.displayName = 'Section'
export default Section
