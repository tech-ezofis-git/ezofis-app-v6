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
      viewport={{ margin: '-50px', once: true }}
      whileInView='visible'
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            delayChildren: 0.1,
            staggerChildren: staggerDelay,
          },
        },
      }}
    >
      {childrenArray.map((child, index) => (
        <motion.div
          key={index}
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: {
              opacity: 1,
              transition: {
                duration: staggerDuration,
                ease: [0.16, 1, 0.3, 1],
              },
              y: 0,
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
