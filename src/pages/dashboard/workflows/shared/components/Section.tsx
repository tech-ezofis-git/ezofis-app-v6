import type { ReactNode } from 'react'
import { useViewportSize } from '@mantine/hooks'
import { SCREEN_XL } from '@/constants'
import cn from '@/utils/cn'
import setupStore from '../../accounts-payable/stores/useSetupStore'
interface Props {
  children: ReactNode
  title: string
  icon?: string
}

const Section = ({ children, title }: Props) => {
  const { width } = useViewportSize()
  const isApSetUpCompleted = setupStore((state) => state.isApSetUpCompleted)
  return (
    <div
      className={cn(`${isApSetUpCompleted ? "pt-6" : "pt-4"} mb-8 px-6 md:px-8 `, width >= SCREEN_XL && '@container')}
    >
      <h2 className='m-0 mb-4 font-poppins text-15 font-medium text-gray-13'>
        {title}
      </h2>
      {children}
    </div>
  )
}

Section.displayName = 'Section'
export default Section