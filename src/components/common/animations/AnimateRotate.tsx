import { type HTMLMotionProps, motion } from 'motion/react'

interface Props extends HTMLMotionProps<'div'> {
  delay?: number
  duration?: number
  rotation?: number
}

const AnimateRotate = ({
  delay = 0,
  duration = 0.5,
  rotation = 5,
  ...rest
}: Props) => {
  return (
    <motion.div
      {...rest}
      animate={{ opacity: 1, rotate: 0 }}
      initial={{ opacity: 0, rotate: -rotation }}
      transition={{ delay, duration, ease: [0.16, 1, 0.3, 1] }}
    />
  )
}

AnimateRotate.displayName = 'AnimateRotate'
export default AnimateRotate
