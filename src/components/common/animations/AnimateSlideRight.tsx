import { type HTMLMotionProps, motion } from 'motion/react'

interface Props extends HTMLMotionProps<'div'> {
  delay?: number
  distance?: number
  duration?: number
}

const AnimateSlideRight = ({
  delay = 0,
  distance = 30,
  duration = 0.5,
  ...rest
}: Props) => {
  return (
    <motion.div
      {...rest}
      animate={{ opacity: 1, x: 0 }}
      initial={{ opacity: 0, x: -distance }}
      transition={{ delay, duration, ease: [0.16, 1, 0.3, 1] }}
    />
  )
}

AnimateSlideRight.displayName = 'AnimateSlideRight'
export default AnimateSlideRight
