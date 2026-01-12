import { type HTMLMotionProps, motion } from 'motion/react'

interface Props extends HTMLMotionProps<'div'> {
    delay?: number
    duration?: number
}

const AnimateBounce = ({ delay = 0, duration = 0.6, ...rest }: Props) => {
    return (
        <motion.div
            {...rest}
            animate={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: -30 }}
            transition={{
                duration,
                delay,
                ease: [0.68, -0.55, 0.265, 1.55],
                type: 'spring',
            }}
        />
    )
}

AnimateBounce.displayName = 'AnimateBounce'
export default AnimateBounce