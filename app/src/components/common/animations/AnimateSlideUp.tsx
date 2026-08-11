import { type HTMLMotionProps, motion } from 'motion/react'

interface Props extends HTMLMotionProps<'div'> {
  delay?: number
  distance?: number
  duration?: number
}

const AnimateSlideUp = ({
  delay = 0,
  distance = 20,
  duration = 0.5,
  ...rest
}: Props) => {
  return (
    <motion.div
      {...rest}
      animate={{ opacity: 1, y: 0 }}
      initial={{ opacity: 0, y: distance }}
      transition={{ delay, duration, ease: [0.16, 1, 0.3, 1] }}
    />
  )
}

AnimateSlideUp.displayName = 'AnimateSlideUp'
export default AnimateSlideUp
