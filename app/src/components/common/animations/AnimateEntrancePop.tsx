import { type HTMLMotionProps, motion } from 'motion/react'
import cn from '@/utils/cn'

interface Props extends HTMLMotionProps<'div'> {
  delay?: number
  duration?: number
}

const AnimateEntrancePop = ({
  className,
  delay = 0,
  duration = 0.5,
  ...rest
}: Props) => {
  return (
    <motion.div
      className={cn('flex flex-col gap-6', className)}
      {...rest}
      animate={{ opacity: 1, scale: 1 }}
      initial={{ opacity: 0, scale: 0.9 }}
      transition={{ delay, duration, ease: [0.16, 1, 0.3, 1] }}
    />
  )
}

AnimateEntrancePop.displayName = 'AnimateEntrancePop'
export default AnimateEntrancePop
