import type { ReactNode } from 'react'
import { useViewportSize } from '@mantine/hooks'
import Icon from '@/components/base/icon/Icon'
import { SCREEN_XL } from '@/constants'
import cn from '@/utils/cn'

interface Props {
  children: ReactNode
  icon: string
  title: string
}

const Section = ({ children, icon, title }: Props) => {
  const { width } = useViewportSize()

  return (
    <div
      className={cn('mb-10 px-6 md:px-10', width >= SCREEN_XL && '@container')}
    >
      <div className='m-0 mb-5 flex items-center gap-2'>
        <Icon className='size-5' name={icon} />
        <h2 className='text-base font-medium text-gray-13'>{title}</h2>
      </div>
      {children}
    </div>
  )
}

Section.displayName = 'Section'
export default Section
