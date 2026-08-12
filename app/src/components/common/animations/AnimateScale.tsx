import { type HTMLMotionProps, motion } from 'motion/react'

interface Props extends HTMLMotionProps<'div'> {
  delay?: number
  duration?: number
  scale?: number
}

const AnimateScale = ({
  delay = 0,
  duration = 0.4,
  scale = 0.95,
  ...rest
}: Props) => {
  return (
    <motion.div
      {...rest}
      animate={{ opacity: 1, scale: 1 }}
      initial={{ opacity: 0, scale }}
      transition={{ delay, duration, ease: [0.16, 1, 0.3, 1] }}
    />
  )
}

AnimateScale.displayName = 'AnimateScale'
export default AnimateScale
