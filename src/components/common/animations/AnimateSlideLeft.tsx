import { type HTMLMotionProps, motion } from 'motion/react'

interface Props extends HTMLMotionProps<'div'> {
    delay?: number
    duration?: number
    distance?: number
}

const AnimateSlideLeft = ({
    delay = 0,
    distance = 30,
    duration = 0.5,
    ...rest
}: Props) => {
    return (
        <motion.div
            {...rest}
            animate={{ opacity: 1, x: 0 }}
            initial={{ opacity: 0, x: distance }}
            transition={{ duration, delay, ease: [0.16, 1, 0.3, 1] }}
        />
    )
}

AnimateSlideLeft.displayName = 'AnimateSlideLeft'
export default AnimateSlideLeft