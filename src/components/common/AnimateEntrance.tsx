import { type HTMLMotionProps, motion } from 'motion/react'

const AnimateEntrance = ({ ...rest }: HTMLMotionProps<'div'>) => {
  return (
    <motion.div
      {...rest}
      animate={{ opacity: 1, scale: 1 }}
      className='flex flex-col gap-6'
      initial={{ opacity: 0, scale: 0.9 }}
    />
  )
}

AnimateEntrance.displayName = 'AnimateEntrance'
export default AnimateEntrance
