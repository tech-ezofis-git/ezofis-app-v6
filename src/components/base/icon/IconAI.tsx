import { motion } from 'motion/react'
import cn from '@/utils/cn'

interface Props {
  animate?: boolean
  className?: string
}

const transition = {
  duration: 3,
  repeat: Infinity,
  repeatDelay: 1,
  times: [0, 0.25, 0.5, 0.75, 1],
}
const animation1 = { scale: [1, 0.6, 1, 0.6, 1] }
const animation2 = { scale: [1, 1.6, 0.6, 1.6, 1] }
const primaryColor = '#8316e4'
const secondaryColor = '#00bcd4'
const tertiaryColor = '#4269DC'

const IconAI = ({ animate, className }: Props) => {
  return (
    <motion.svg
      aria-label='AI Icon'
      className={cn('size-5', className)}
      height='24'
      role='img'
      viewBox='0 0 24 24'
      width='24'
      xmlns='http://www.w3.org/2000/svg'
    >
      <defs>
        <linearGradient id='g1' x2='0' y2='1'>
          <stop offset='0%' stopColor={secondaryColor} />
          <stop offset='100%' stopColor={primaryColor} />
        </linearGradient>
        <linearGradient id='g2' x2='0' y2='1'>
          <stop offset='0%' stopColor={primaryColor} />
          <stop offset='100%' stopColor={tertiaryColor} />
        </linearGradient>
        <linearGradient id='g3' x2='0' y2='1'>
          <stop offset='0%' stopColor={secondaryColor} />
          <stop offset='100%' stopColor={tertiaryColor} />
        </linearGradient>
      </defs>
      <g fill='none'>
        <motion.path
          animate={animate ? animation1 : undefined}
          className='fill-[url(#g1)]'
          d='M9.107 5.448c.598-1.75 3.016-1.803 3.725-.159l.06.16l.807 2.36a4 4 0 0 0 2.276 2.411l.217.081l2.36.806c1.75.598 1.803 3.016.16 3.725l-.16.06l-2.36.807a4 4 0 0 0-2.412 2.276l-.081.216l-.806 2.361c-.598 1.75-3.016 1.803-3.724.16l-.062-.16l-.806-2.36a4 4 0 0 0-2.276-2.412l-.216-.081l-2.36-.806c-1.751-.598-1.804-3.016-.16-3.724l.16-.062l2.36-.806A4 4 0 0 0 8.22 8.025l.081-.216z'
          transition={animate ? transition : undefined}
        />
        <motion.path
          animate={animate ? animation2 : undefined}
          className='fill-[url(#g2)] dark:fill-[url(#g3)]'
          d='M19 2a1 1 0 0 1 .898.56l.048.117l.35 1.026l1.027.35a1 1 0 0 1 .118 1.845l-.118.048l-1.026.35l-.35 1.027a1 1 0 0 1-1.845.117l-.048-.117l-.35-1.026l-1.027-.35a1 1 0 0 1-.118-1.845l.118-.048l1.026-.35l.35-1.027A1 1 0 0 1 19 2'
          transition={animate ? transition : undefined}
        />
      </g>
    </motion.svg>
  )
}

IconAI.displayName = 'IconAI'
export default IconAI
