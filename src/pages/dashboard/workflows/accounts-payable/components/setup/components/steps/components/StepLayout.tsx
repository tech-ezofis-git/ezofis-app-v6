import { motion } from 'motion/react'
import Divider from '@/components/base/Divider'
import Title from '@/components/base/Title'
import { AnimateFadeIn, AnimateSlideUp } from '@/components/common/animations'
import cn from '@/utils/cn'

interface StepLayoutProps {
  children: React.ReactNode
  description: string
  title: string
  footer?: React.ReactNode
  showDivider?: boolean
}

export const StepLayout = ({
  children,
  description,
  footer,
  showDivider = true,
  title,
}: StepLayoutProps) => {
  return (
    <div className='flex min-h-full w-full flex-col gap-6 pt-3 pb-6 md:gap-7 md:pb-8'>
      <AnimateSlideUp delay={0.1}>
        <Title
          className='items-start text-left'
          description={description}
          descriptionClassName='max-w-2xl text-pretty'
          level={2}
          title={title}
          titleClassName='tracking-tight'
        />
      </AnimateSlideUp>

      {showDivider && (
        <AnimateFadeIn delay={0.2}>
          <Divider />
        </AnimateFadeIn>
      )}

      <div className='flex flex-col gap-6 md:gap-7'>{children}</div>

      {footer}
    </div>
  )
}

interface StepFooterProps {
  children: React.ReactNode
  align?: 'between' | 'end'
}

export const StepFooter = ({
  align = 'between',
  children,
}: StepFooterProps) => (
  <motion.div
    animate={{ opacity: 1, y: 0 }}
    initial={{ opacity: 0, y: 10 }}
    transition={{ delay: 0.5, duration: 0.4 }}
    className={cn(
      'mt-2 flex flex-wrap items-center gap-3 border-t border-gray-3 pt-6',
      align === 'end' ? 'justify-end' : 'justify-between',
    )}
  >
    {children}
  </motion.div>
)

export const OrDivider = () => (
  <div className='flex items-center gap-4 py-0.5'>
    <div className='flex-1 border-t border-gray-3' />
    <span className='text-12/4 font-medium tracking-wide text-gray-9 uppercase'>
      or
    </span>
    <div className='flex-1 border-t border-gray-3' />
  </div>
)

StepLayout.displayName = 'StepLayout'
