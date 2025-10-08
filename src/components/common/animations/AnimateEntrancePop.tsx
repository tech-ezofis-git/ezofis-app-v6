import { type HTMLMotionProps, motion } from 'motion/react'

const AnimateEntrancePop = ({ ...rest }: HTMLMotionProps<'div'>) => {
  return (
    <motion.div
      className='flex flex-col gap-6'
      {...rest}
      animate={{ opacity: 1, scale: 1 }}
      initial={{ opacity: 0, scale: 0.9 }}
    />
  )
}

AnimateEntrancePop.displayName = 'AnimateEntrancePop'
export default AnimateEntrancePop
