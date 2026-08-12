import { type HTMLMotionProps, motion } from 'motion/react'

const AnimateEntranceSlideLeft = ({ ...rest }: HTMLMotionProps<'div'>) => {
  return (
    <motion.div
      {...rest}
      transition={{ bounce: 0 }}
      animate={{
        opacity: 1,
        x: 0,
      }}
      initial={{
        opacity: 0,
        x: 100,
      }}
    />
  )
}

AnimateEntranceSlideLeft.displayName = 'AnimateEntranceSlideLeft'
export default AnimateEntranceSlideLeft
