import { type HTMLMotionProps, motion } from 'motion/react'

interface Props extends HTMLMotionProps<'div'> {
    delay?: number
    duration?: number
}

const AnimateFadeIn = ({ delay = 0, duration = 0.4, ...rest }: Props) => {
    return (
        <motion.div
            {...rest}
            animate={{ opacity: 1 }}
            initial={{ opacity: 0 }}
            transition={{ duration, delay, ease: 'easeOut' }}
        />
    )
}

AnimateFadeIn.displayName = 'AnimateFadeIn'
export default AnimateFadeIn