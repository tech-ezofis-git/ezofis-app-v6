import { type HTMLMotionProps, motion } from 'motion/react'
import { Children, type ReactNode } from 'react'

interface Props extends Omit<HTMLMotionProps<'div'>, 'children'> {
    children: ReactNode
    staggerDelay?: number
    staggerDuration?: number
}

const AnimateStagger = ({
    children,
    staggerDelay = 0.1,
    staggerDuration = 0.4,
    ...rest
}: Props) => {
    const childrenArray = Children.toArray(children)

    return (
        <motion.div
            {...rest}
            initial='hidden'
            variants={{
                hidden: { opacity: 0 },
                visible: {
                    opacity: 1,
                    transition: {
                        staggerChildren: staggerDelay,
                        delayChildren: 0.1,
                    },
                },
            }}
            viewport={{ once: true, margin: '-50px' }}
            whileInView='visible'
        >
            {childrenArray.map((child, index) => (
                <motion.div
                    key={index}
                    variants={{
                        hidden: { opacity: 0, y: 20 },
                        visible: {
                            opacity: 1,
                            y: 0,
                            transition: {
                                duration: staggerDuration,
                                ease: [0.16, 1, 0.3, 1],
                            },
                        },
                    }}
                >
                    {child}
                </motion.div>
            ))}
        </motion.div>
    )
}

AnimateStagger.displayName = 'AnimateStagger'
export default AnimateStagger